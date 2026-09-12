import { prisma } from "@mimo/database";
import { refundPaypalCapture, sendPaypalPayout } from "./paypal-service";

/**
 * Qué hacer con la parte de un negocio dentro de un `Payment` ya cobrado
 * (carrito multi-tienda: un solo cobro de PayPal puede cubrir varios
 * negocios, ver `PaymentSplit` en el schema). Ninguna de las dos funciones
 * hace nada si el pedido no se pagó con PayPal (ej. CASH) — ahí no hay nada
 * que repartir ni reembolsar.
 *
 * Devuelven un mensaje para mostrarle al negocio solo cuando algo necesita
 * su atención (no se pudo pagar/reembolsar automáticamente) — `null` si
 * todo salió bien o si no aplica.
 */

async function findPendingSplit(orderId: string, businessId: string) {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.provider !== "PAYPAL") return null;

  const split = await prisma.paymentSplit.findUnique({
    where: { paymentId_businessId: { paymentId: payment.id, businessId } },
  });
  if (!split || split.status !== "PENDING") return null;

  return { payment, split };
}

/** El negocio confirmó su parte del pedido — le mandamos su parte neta por
 * PayPal Payouts. */
export async function resolvePaymentSplitOnConfirm(orderId: string, businessId: string): Promise<string | null> {
  const found = await findPendingSplit(orderId, businessId);
  if (!found) return null;
  const { split } = found;

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { paypalEmail: true },
  });

  if (!business.paypalEmail) {
    await prisma.paymentSplit.update({ where: { id: split.id }, data: { status: "PAYOUT_FAILED" } });
    return "Confirmamos tu pedido, pero no pudimos pagarte automáticamente: agregá tu correo de PayPal en tu perfil.";
  }

  try {
    const batchId = await sendPaypalPayout({
      receiverEmail: business.paypalEmail,
      amount: Number(split.netAmount),
      senderItemId: split.id,
    });
    await prisma.paymentSplit.update({
      where: { id: split.id },
      data: { status: "PAID_OUT", payoutReference: batchId },
    });
    return null;
  } catch {
    await prisma.paymentSplit.update({ where: { id: split.id }, data: { status: "PAYOUT_FAILED" } });
    return "Confirmamos tu pedido, pero el pago automático falló. El equipo de MIMO te va a contactar para resolverlo.";
  }
}

/** El negocio no pudo confirmar (o el admin/cron canceló su ítem) — le
 * reembolsamos al comprador la parte que le correspondía a este negocio. */
export async function resolvePaymentSplitOnCancel(orderId: string, businessId: string): Promise<string | null> {
  const found = await findPendingSplit(orderId, businessId);
  if (!found) return null;
  const { payment, split } = found;

  if (!payment.providerReference) return null;

  try {
    const refundId = await refundPaypalCapture(
      payment.providerReference,
      Number(split.grossAmount),
      payment.currency,
      "Uno de los negocios de tu pedido no pudo confirmarlo — te reembolsamos esa parte.",
    );
    await prisma.$transaction([
      prisma.paymentSplit.update({ where: { id: split.id }, data: { status: "REFUNDED", refundReference: refundId } }),
      prisma.payment.update({ where: { id: payment.id }, data: { status: "PARTIALLY_REFUNDED" } }),
    ]);
    return null;
  } catch {
    return "El pedido se canceló, pero no pudimos reembolsar automáticamente esa parte al comprador. El equipo de MIMO se va a encargar.";
  }
}
