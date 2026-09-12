import { Prisma, prisma, type OrderItemStatus } from "@mimo/database";
import type { BusinessOrderItemDTO, NotificationType, PersonalizationInput } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { createNotification } from "./notification-service";
import { computeOrderStatus, isValidTransition } from "./order-status-logic";
import { resolvePaymentSplitOnCancel, resolvePaymentSplitOnConfirm } from "./payment-split-service";

const BUSINESS_ORDER_ITEM_INCLUDE = {
  product: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
  order: { include: { address: { include: { municipality: true } } } },
} satisfies Prisma.OrderItemInclude;

type BusinessOrderItemRow = Prisma.OrderItemGetPayload<{ include: typeof BUSINESS_ORDER_ITEM_INCLUDE }>;

function toBusinessOrderItemDTO(item: BusinessOrderItemRow): BusinessOrderItemDTO {
  const address = item.order.address;
  return {
    id: item.id,
    orderId: item.orderId,
    orderNumber: item.order.orderNumber,
    businessId: item.businessId,
    productId: item.productId,
    productName: item.product.name,
    productImageUrl: item.product.images[0]?.url ?? null,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    personalization: (item.personalization as PersonalizationInput | null) ?? null,
    status: item.status,
    paymentNote: null,
    createdAt: item.createdAt.toISOString(),
    buyerName: item.order.buyerName,
    buyerPhone: item.order.buyerPhone,
    recipientName: address?.recipientName ?? "",
    recipientPhone: address?.recipientPhone ?? "",
    addressLine: address?.addressLine ?? "",
    reference: address?.reference ?? null,
    municipalityName: address?.municipality?.name ?? null,
    deliveryDate: address?.deliveryDate.toISOString() ?? item.order.createdAt.toISOString(),
    deliveryWindow: address?.deliveryWindow ?? "ASAP",
    deliveryInstructions: address?.deliveryInstructions ?? null,
    isSurpriseMode: item.order.isSurpriseMode,
    surpriseInstructions: item.order.surpriseInstructions,
  };
}

// PENDING no dispara nada (es el estado inicial, no una transición). El resto
// avisa al comprador — es su pedido el que cambió, no el del negocio.
const ORDER_STATUS_NOTIFICATION: Partial<Record<OrderItemStatus, { type: NotificationType; title: string }>> = {
  CONFIRMED: { type: "ORDER_CONFIRMED", title: "Tu pedido fue confirmado" },
  PREPARING: { type: "ORDER_IN_PROGRESS", title: "Tu pedido está en preparación" },
  OUT_FOR_DELIVERY: { type: "ORDER_OUT_FOR_DELIVERY", title: "Tu pedido salió a entrega" },
  DELIVERED: { type: "ORDER_DELIVERED", title: "Tu pedido fue entregado" },
  CANCELLED: { type: "ORDER_CANCELLED", title: "Tu pedido fue cancelado" },
};

export async function listBusinessOrderItems(
  businessId: string,
  filters: { status?: OrderItemStatus } = {},
): Promise<BusinessOrderItemDTO[]> {
  const items = await prisma.orderItem.findMany({
    where: { businessId, ...(filters.status ? { status: filters.status } : {}) },
    include: BUSINESS_ORDER_ITEM_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return items.map(toBusinessOrderItemDTO);
}

export async function updateBusinessOrderItemStatus(
  businessId: string,
  itemId: string,
  nextStatus: OrderItemStatus,
): Promise<BusinessOrderItemDTO> {
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, businessId },
    include: BUSINESS_ORDER_ITEM_INCLUDE,
  });
  if (!item) {
    throw new AppError("NOT_FOUND", "No encontramos ese pedido en tu negocio.", 404);
  }
  if (!isValidTransition(item.status, nextStatus)) {
    throw new AppError(
      "INVALID_TRANSITION",
      `No podés pasar un pedido de "${item.status}" a "${nextStatus}".`,
      400,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.orderItem.update({
      where: { id: itemId },
      data: { status: nextStatus },
      include: BUSINESS_ORDER_ITEM_INCLUDE,
    });

    const siblingItems = await tx.orderItem.findMany({
      where: { orderId: item.orderId },
      select: { status: true },
    });
    await tx.order.update({
      where: { id: item.orderId },
      data: { status: computeOrderStatus(siblingItems.map((sibling) => sibling.status)) },
    });

    return updatedItem;
  });

  const notification = ORDER_STATUS_NOTIFICATION[nextStatus];
  if (notification) {
    await createNotification({
      userId: updated.order.buyerId,
      type: notification.type,
      title: notification.title,
      body: `${updated.product.name} · Pedido #${updated.order.orderNumber}`,
      linkHref: `/pedidos/${updated.order.orderNumber}`,
    });
  }

  // Si el pedido se pagó con PayPal, esto reparte (al confirmar) o
  // reembolsa (al cancelar) la parte de ESTE negocio — ver
  // `payment-split-service.ts`. No hace nada para pagos en efectivo.
  let paymentNote: string | null = null;
  if (nextStatus === "CONFIRMED") {
    paymentNote = await resolvePaymentSplitOnConfirm(item.orderId, businessId);
  } else if (nextStatus === "CANCELLED") {
    paymentNote = await resolvePaymentSplitOnCancel(item.orderId, businessId);
  }

  return { ...toBusinessOrderItemDTO(updated), paymentNote };
}
