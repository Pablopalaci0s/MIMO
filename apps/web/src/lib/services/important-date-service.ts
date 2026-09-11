import { prisma } from "@mimo/database";
import type { ImportantDateDTO, ImportantDateInput } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { daysBetweenUtc, nextAnnualOccurrence, parseUtcDateOnly } from "@/lib/date-utils";
import { createNotification } from "./notification-service";

type ImportantDateRow = {
  id: string;
  type: ImportantDateDTO["type"];
  label: string;
  date: Date;
  recipientName: string | null;
  remindDaysBefore: number;
};

function toImportantDateDTO(row: ImportantDateRow): ImportantDateDTO {
  const now = new Date();
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    date: row.date.toISOString().slice(0, 10),
    recipientName: row.recipientName,
    remindDaysBefore: row.remindDaysBefore,
    // Se repite cada año: lo que importa es cuándo cae el próximo 10 de
    // septiembre, no cuántos días pasaron desde el año en que se cargó.
    daysUntil: daysBetweenUtc(now, nextAnnualOccurrence(now, row.date)),
  };
}

export async function listImportantDates(userId: string): Promise<ImportantDateDTO[]> {
  const dates = await prisma.importantDate.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  return dates.map(toImportantDateDTO);
}

export async function createImportantDate(
  userId: string,
  input: ImportantDateInput,
): Promise<ImportantDateDTO> {
  const created = await prisma.importantDate.create({
    data: {
      userId,
      type: input.type,
      label: input.label,
      date: parseUtcDateOnly(input.date),
      recipientName: input.recipientName || null,
      remindDaysBefore: input.remindDaysBefore ?? 7,
    },
  });
  return toImportantDateDTO(created);
}

export async function updateImportantDate(
  userId: string,
  id: string,
  input: ImportantDateInput,
): Promise<ImportantDateDTO> {
  const existing = await prisma.importantDate.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa fecha.", 404);

  const updated = await prisma.importantDate.update({
    where: { id },
    data: {
      type: input.type,
      label: input.label,
      date: parseUtcDateOnly(input.date),
      recipientName: input.recipientName || null,
      remindDaysBefore: input.remindDaysBefore ?? 7,
    },
  });
  return toImportantDateDTO(updated);
}

export async function deleteImportantDate(userId: string, id: string): Promise<void> {
  const existing = await prisma.importantDate.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa fecha.", 404);
  await prisma.importantDate.delete({ where: { id } });
}

/**
 * Revisa si alguna fecha importante de `userId` está dentro de su ventana de
 * aviso (`remindDaysBefore`) y crea la notificación correspondiente. Se
 * repite cada año: la ocurrencia se calcula con `nextAnnualOccurrence`, y el
 * año de ESA ocurrencia va en `metadata.occurrenceYear` — así el chequeo de
 * "ya avisado" (`metadata.importantDateId` + `occurrenceYear`) solo bloquea
 * duplicados dentro del mismo año, no para siempre después del primer aviso.
 *
 * Se llama desde dos lugares: de forma perezosa cuando el usuario visita el
 * home (`checkImportantDateReminders`, mantiene el aviso fresco aunque el
 * cron no haya corrido todavía) y desde `checkAllImportantDateReminders`,
 * que sí es un job programado real — ver `/api/cron/fechas-importantes` y
 * `.github/workflows/cron-fechas-importantes.yml`.
 */
async function checkDatesForUser(userId: string, dates: { id: string; label: string; date: Date; recipientName: string | null; remindDaysBefore: number }[]): Promise<number> {
  const now = new Date();
  let created = 0;

  for (const date of dates) {
    const occurrence = nextAnnualOccurrence(now, date.date);
    const daysUntil = daysBetweenUtc(now, occurrence);
    if (daysUntil < 0 || daysUntil > date.remindDaysBefore) continue;

    const occurrenceYear = occurrence.getUTCFullYear();
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId,
        type: "IMPORTANT_DATE_REMINDER",
        metadata: { path: ["importantDateId"], equals: date.id },
        AND: { metadata: { path: ["occurrenceYear"], equals: occurrenceYear } },
      },
    });
    if (alreadyNotified) continue;

    const when = daysUntil === 0 ? "es hoy" : daysUntil === 1 ? "es mañana" : `es en ${daysUntil} días`;
    await createNotification({
      userId,
      type: "IMPORTANT_DATE_REMINDER",
      title: `${date.label} ${when}`,
      body: date.recipientName
        ? `No te olvidés de ${date.recipientName} — todavía estás a tiempo de pedir algo.`
        : "Todavía estás a tiempo de pedir algo especial.",
      metadata: { importantDateId: date.id, occurrenceYear },
      linkHref: "/ayudame-a-elegir",
    });
    created++;
  }

  return created;
}

export async function checkImportantDateReminders(userId: string): Promise<void> {
  const dates = await prisma.importantDate.findMany({ where: { userId } });
  await checkDatesForUser(userId, dates);
}

/**
 * Versión "todos los usuarios" para el cron real — agrupa por usuario para
 * no golpear la base con una query por persona en un solo `findMany`.
 */
export async function checkAllImportantDateReminders(): Promise<{ usersChecked: number; remindersCreated: number }> {
  const dates = await prisma.importantDate.findMany();
  const byUser = new Map<string, typeof dates>();
  for (const date of dates) {
    const list = byUser.get(date.userId) ?? [];
    list.push(date);
    byUser.set(date.userId, list);
  }

  let remindersCreated = 0;
  for (const [userId, userDates] of byUser) {
    remindersCreated += await checkDatesForUser(userId, userDates);
  }

  return { usersChecked: byUser.size, remindersCreated };
}
