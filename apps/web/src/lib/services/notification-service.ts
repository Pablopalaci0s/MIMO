import { Prisma, prisma, type NotificationType } from "@mimo/database";
import type { NotificationDTO, NotificationListDTO } from "@mimo/types";
import { AppError } from "@/lib/errors";

type NotificationRow = Prisma.NotificationGetPayload<object>;

function toNotificationDTO(row: NotificationRow): NotificationDTO {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? null;
  const href = metadata && typeof metadata.href === "string" ? metadata.href : null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.isRead,
    linkHref: href,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Único punto de creación de notificaciones — todo lo demás (pedidos,
 * negocios aprobados/suspendidos, reseñas recibidas, fechas importantes)
 * pasa por acá para que el modelo de datos (`metadata.href`) sea consistente.
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkHref?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: { ...input.metadata, ...(input.linkHref ? { href: input.linkHref } : {}) },
    },
  });
}

export async function listNotifications(userId: string, limit = 30): Promise<NotificationListDTO> {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { items: items.map(toNotificationDTO), unreadCount };
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa notificación.", 404);
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
