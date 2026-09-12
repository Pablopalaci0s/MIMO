import { Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { listMyOrders } from "@/lib/services/order-service";

export const metadata: Metadata = { title: "Mis pedidos" };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export default async function MyOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/mis-pedidos");

  const orders = await listMyOrders(session.user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Mis pedidos</h1>

      {orders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Package className="size-8 text-neutral-300" />
          <p className="text-neutral-600">Todavía no tenés pedidos.</p>
          <Link href="/regalos" className="text-sm font-medium text-neutral-900 underline">
            Explorar regalos
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/pedidos/${order.orderNumber}`}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">#{order.orderNumber}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(order.createdAt).toLocaleDateString("es-SV", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-neutral-900">${order.total.toFixed(2)}</p>
                <p className="text-xs text-neutral-500">{STATUS_LABEL[order.status]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
