import { prisma } from "@mimo/database";
import { createNotification } from "./notification-service";
import { computeOrderStatus } from "./order-status-logic";
import { resolvePaymentSplitOnCancel } from "./payment-split-service";

/** Cuánto tiempo tiene un negocio para confirmar su parte de un pedido ya
 * pagado con PayPal antes de que se cancele sola y se le reembolse al
 * comprador — ver README, "Diseño: pagos con PayPal". */
const CONFIRM_WINDOW_MINUTES = 45;

/**
 * El job programado que hace real la promesa de "si el negocio no confirma
 * a tiempo, no se le cobra" para pagos con PayPal (que sí se capturan al
 * momento del checkout, a diferencia de CASH). Pensado para un cron externo
 * cada 10-15 min (`.github/workflows/cron-expirar-pedidos.yml`), no para
 * que lo dispare un usuario.
 */
export async function expireUnconfirmedPaypalOrders(): Promise<{ cancelledItems: number; affectedBusinesses: number }> {
  const cutoff = new Date(Date.now() - CONFIRM_WINDOW_MINUTES * 60_000);

  const staleItems = await prisma.orderItem.findMany({
    where: {
      status: "PENDING",
      order: {
        createdAt: { lt: cutoff },
        payment: { provider: "PAYPAL", status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      },
    },
    select: { id: true, orderId: true, businessId: true, order: { select: { orderNumber: true, buyerId: true } } },
  });

  interface Group {
    orderId: string;
    orderNumber: string;
    buyerId: string;
    businessId: string;
    itemIds: string[];
  }
  const groups = new Map<string, Group>();
  for (const item of staleItems) {
    const key = `${item.orderId}:${item.businessId}`;
    const group = groups.get(key);
    if (group) {
      group.itemIds.push(item.id);
    } else {
      groups.set(key, {
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        buyerId: item.order.buyerId,
        businessId: item.businessId,
        itemIds: [item.id],
      });
    }
  }

  for (const group of groups.values()) {
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({ where: { id: { in: group.itemIds } }, data: { status: "CANCELLED" } });
      const siblingItems = await tx.orderItem.findMany({
        where: { orderId: group.orderId },
        select: { status: true },
      });
      await tx.order.update({
        where: { id: group.orderId },
        data: { status: computeOrderStatus(siblingItems.map((sibling) => sibling.status)) },
      });
    });

    await createNotification({
      userId: group.buyerId,
      type: "ORDER_CANCELLED",
      title: "Parte de tu pedido fue cancelada",
      body: `Un negocio no confirmó a tiempo tu pedido #${group.orderNumber} — ya te reembolsamos esa parte.`,
      linkHref: `/pedidos/${group.orderNumber}`,
    });

    await resolvePaymentSplitOnCancel(group.orderId, group.businessId);
  }

  return { cancelledItems: staleItems.length, affectedBusinesses: groups.size };
}
