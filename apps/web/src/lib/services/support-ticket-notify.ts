import { prisma } from "@mimo/database";
import { logger } from "@/lib/logger";
import { createNotification } from "./notification-service";

/**
 * Avisos al equipo de soporte, reutilizando `createNotification` (que ya manda
 * también Web Push). Anti-spam: cada llamador decide CUÁNDO avisar (un aviso
 * por evento que importa, nunca por cada mensaje seguido) y estas funciones
 * nunca tumban la operación que las dispara.
 */

export function ticketHref(ticketId: string): string {
  return `/centro-soporte?t=${ticketId}`;
}

/**
 * A quién avisarle de un ticket nuevo sin dueño ("queue": agentes y
 * supervisores) o de algo que requiere supervisión ("managers"). Si todavía no
 * hay personal de soporte cargado, el aviso cae en los administradores para
 * que nunca se pierda.
 */
export async function staffRecipientIds(kind: "queue" | "managers", excludeUserId?: string): Promise<string[]> {
  const roles = kind === "queue" ? (["SUPPORT_AGENT", "SUPPORT_MANAGER"] as const) : (["SUPPORT_MANAGER"] as const);
  let users = await prisma.user.findMany({
    where: { role: { in: [...roles] }, deletedAt: null },
    select: { id: true },
  });
  if (users.length === 0) {
    users = await prisma.user.findMany({ where: { role: "ADMIN", deletedAt: null }, select: { id: true } });
  }
  return users.map((user) => user.id).filter((id) => id !== excludeUserId);
}

export async function notifyStaff(
  userIds: string[],
  input: { title: string; body: string; ticketId: string },
): Promise<void> {
  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        type: "SUPPORT_MESSAGE",
        title: input.title,
        body: input.body,
        linkHref: ticketHref(input.ticketId),
      }).catch((error) => logger.error("No se pudo notificar a una persona de soporte", { error: String(error) })),
    ),
  );
}
