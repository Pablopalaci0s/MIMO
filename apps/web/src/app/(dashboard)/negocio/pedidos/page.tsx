import { Download } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { OrderItemCard } from "@/components/negocio/order-item-card";
import { listBusinessOrderItems } from "@/lib/services/business-order-service";
import { requireBusinessId } from "@/lib/services/business-service";
import type { OrderItemStatus } from "@mimo/database";

const FILTERS: { value: OrderItemStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "PREPARING", label: "Preparando" },
  { value: "OUT_FOR_DELIVERY", label: "En camino" },
  { value: "DELIVERED", label: "Entregados" },
  { value: "CANCELLED", label: "Cancelados" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export default async function BusinessOrdersPage({ searchParams }: PageProps<"/negocio/pedidos">) {
  const rawParams = await searchParams;
  const statusParam = Array.isArray(rawParams.status) ? rawParams.status[0] : rawParams.status;
  const activeFilter = FILTERS.some((filter) => filter.value === statusParam)
    ? (statusParam as OrderItemStatus | "ALL")
    : "ALL";

  const businessId = await requireBusinessId();
  const items = await listBusinessOrderItems(
    businessId,
    activeFilter === "ALL" ? {} : { status: activeFilter },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Pedidos</h1>
          <p className="text-sm text-neutral-500">{items.length} pedidos en este estado.</p>
        </div>
        <a
          href={`/api/negocio/pedidos/export${activeFilter === "ALL" ? "" : `?status=${activeFilter}`}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          <Download className="size-3.5" />
          Exportar CSV
        </a>
      </div>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "ALL" ? "/negocio/pedidos" : `/negocio/pedidos?status=${filter.value}`}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              activeFilter === filter.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-300",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
          No hay pedidos en este estado.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <OrderItemCard key={item.id} item={item} statusLabel={STATUS_LABEL[item.status] ?? item.status} />
          ))}
        </div>
      )}
    </div>
  );
}
