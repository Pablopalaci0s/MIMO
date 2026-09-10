import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { ReviewPrompt } from "@/components/reviews/review-prompt";
import { getOrderByNumber } from "@/lib/services/order-service";
import { listReviewableOrderItems } from "@/lib/services/review-service";

export const metadata: Metadata = { title: "Tu pedido — MIMO" };

export default async function OrderDetailPage({
  params,
}: PageProps<"/pedidos/[orderNumber]">) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion");

  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber, session.user.id);
  if (!order) notFound();

  const reviewableItems =
    order.status === "DELIVERED"
      ? (await listReviewableOrderItems(session.user.id)).filter((item) => item.orderId === order.id)
      : [];

  const groupedByBusiness = order.items.reduce<Record<string, typeof order.items>>((groups, item) => {
    (groups[item.businessName] ??= []).push(item);
    return groups;
  }, {});

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-10 text-brand" />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">¡Pedido confirmado!</h1>
        <p className="text-sm text-neutral-500">Pedido #{order.orderNumber}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
        <OrderStatusTimeline status={order.status} />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {Object.entries(groupedByBusiness).map(([businessName, businessItems]) => (
          <div key={businessName} className="rounded-2xl border border-neutral-200 p-4">
            <p className="mb-3 text-sm font-semibold text-neutral-900">{businessName}</p>
            <div className="flex flex-col gap-2">
              {businessItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-neutral-600">
                  <span>
                    {item.quantity}× {item.productName}
                  </span>
                  <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {reviewableItems.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">
            ¿Cómo te fue con tu pedido?
          </h2>
          {reviewableItems.map((item) => (
            <ReviewPrompt key={item.productId} item={item} />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-neutral-200 p-4">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>Subtotal</span>
          <span>${order.subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-neutral-600">
          <span>Envío</span>
          <span>${order.deliveryFee.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
        <p className="mt-3 text-xs text-neutral-400">Pago contra entrega (efectivo).</p>
      </div>
    </div>
  );
}
