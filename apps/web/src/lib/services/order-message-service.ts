import { prisma } from "@mimo/database";
import type { OrderMessageDTO, OrderMessageSender } from "@mimo/types";
import { ForbiddenError } from "@mimo/auth";
import { AppError } from "@/lib/errors";
import { createNotification } from "./notification-service";

/**
 * Conversación por pedido+negocio (ver comentario en el schema) — para que
 * el negocio pueda pedir un dato que le falta o avisar que no encuentra la
 * dirección, y el cliente pueda contestar, sin salir de MIMO. Cualquiera de
 * los dos lados dispara una notificación (con push, ver push-service.ts)
 * para el otro lado.
 */
async function assertParticipant(
  orderNumber: string,
  businessId: string,
  userId: string,
): Promise<{ order: { id: string; orderNumber: string; buyerId: string; buyerName: string }; role: OrderMessageSender }> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, orderNumber: true, buyerId: true, buyerName: true },
  });
  if (!order) throw new AppError("NOT_FOUND", "No encontramos ese pedido.", 404);

  if (order.buyerId === userId) return { order, role: "CUSTOMER" };

  const membership = await prisma.businessUser.findFirst({ where: { businessId, userId } });
  if (membership) return { order, role: "BUSINESS" };

  throw new ForbiddenError("No tenés acceso a esta conversación.");
}

export async function listOrderMessages(
  orderNumber: string,
  businessId: string,
  userId: string,
): Promise<OrderMessageDTO[]> {
  const { order } = await assertParticipant(orderNumber, businessId, userId);

  const messages = await prisma.orderMessage.findMany({
    where: { orderId: order.id, businessId },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((message) => ({
    id: message.id,
    senderRole: message.senderRole,
    senderName: message.sender.name,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  }));
}

export async function sendOrderMessage(
  orderNumber: string,
  businessId: string,
  userId: string,
  body: string,
): Promise<OrderMessageDTO> {
  const { order, role } = await assertParticipant(orderNumber, businessId, userId);

  const message = await prisma.orderMessage.create({
    data: { orderId: order.id, businessId, senderId: userId, senderRole: role, body },
    include: { sender: { select: { name: true } } },
  });

  if (role === "CUSTOMER") {
    const owner = await prisma.businessUser.findFirst({
      where: { businessId, role: "OWNER" },
    });
    if (owner) {
      await createNotification({
        userId: owner.userId,
        type: "ORDER_MESSAGE",
        title: `Mensaje de ${order.buyerName}`,
        body,
        linkHref: "/negocio/pedidos",
      });
    }
  } else {
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
    await createNotification({
      userId: order.buyerId,
      type: "ORDER_MESSAGE",
      title: `Mensaje de ${business?.name ?? "el negocio"}`,
      body,
      linkHref: `/pedidos/${order.orderNumber}`,
    });
  }

  return {
    id: message.id,
    senderRole: message.senderRole,
    senderName: message.sender.name,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}
