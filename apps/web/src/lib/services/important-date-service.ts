import { prisma } from "@mimo/database";
import type { ImportantDateDTO, ImportantDateInput } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { createNotification } from "./notification-service";

type ImportantDateRow = {
  id: string;
  type: ImportantDateDTO["type"];
  label: string;
  date: Date;
  recipientName: string | null;
  remindDaysBefore: number;
};

// Días en UTC — mismo criterio que el resto del proyecto (ver gotcha de
// zona horaria en CLAUDE.md) para que "hoy" no dependa de la hora local.
function daysBetweenUtc(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

function toImportantDateDTO(row: ImportantDateRow): ImportantDateDTO {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    date: row.date.toISOString().slice(0, 10),
    recipientName: row.recipientName,
    remindDaysBefore: row.remindDaysBefore,
    daysUntil: daysBetweenUtc(new Date(), row.date),
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
      date: new Date(`${input.date}T00:00:00Z`),
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
      date: new Date(`${input.date}T00:00:00Z`),
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
 * Revisa, en el momento en que el usuario abre el home, si alguna fecha
 * importante está dentro de su ventana de aviso (`remindDaysBefore`) y crea
 * la notificación correspondiente. No hay un cron real detrás — sección 5 de
 * las reglas del usuario prohíbe fingir funcionalidad que no existe, así que
 * en vez de simular un push automático a medianoche, el aviso se genera de
 * forma perezosa la próxima vez que el usuario visita la app dentro de la
 * ventana. `metadata.importantDateId` evita mandar el mismo aviso dos veces.
 */
export async function checkImportantDateReminders(userId: string): Promise<void> {
  const dates = await prisma.importantDate.findMany({ where: { userId } });
  const now = new Date();

  for (const date of dates) {
    const daysUntil = daysBetweenUtc(now, date.date);
    if (daysUntil < 0 || daysUntil > date.remindDaysBefore) continue;

    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId,
        type: "IMPORTANT_DATE_REMINDER",
        metadata: { path: ["importantDateId"], equals: date.id },
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
      metadata: { importantDateId: date.id },
      linkHref: "/ayudame-a-elegir",
    });
  }
}
