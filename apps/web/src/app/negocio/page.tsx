import { Clock, DollarSign, Package, Star } from "lucide-react";
import Link from "next/link";
import { getBusinessDashboardSummary } from "@/lib/services/business-dashboard-service";
import { requireBusinessId } from "@/lib/services/business-service";
import { OrderItemCard } from "@/components/negocio/order-item-card";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  OUT_FOR_DELIVERY: "En camino",
};

export default async function BusinessDashboardPage() {
  const businessId = await requireBusinessId();
  const summary = await getBusinessDashboardSummary(businessId);

  return (
    <div className="flex flex-col gap-8">
      {summary.status !== "APPROVED" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tu negocio está <strong>{summary.status === "PENDING" ? "pendiente de aprobación" : summary.status.toLowerCase()}</strong> —
          todavía no aparece públicamente en MIMO.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Clock className="size-4" />} label="Pedidos pendientes" value={String(summary.pendingOrderItems)} />
        <StatCard icon={<DollarSign className="size-4" />} label="Ventas de hoy" value={`$${summary.todaySales.toFixed(2)}`} />
        <StatCard icon={<DollarSign className="size-4" />} label="Ventas del mes" value={`$${summary.monthSales.toFixed(2)}`} />
        <StatCard icon={<Package className="size-4" />} label="Productos activos" value={String(summary.activeProducts)} />
      </div>

      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Star className="size-4 fill-amber-400 text-amber-400" />
        <span className="font-medium text-neutral-900">{summary.ratingAvg.toFixed(1)}</span>
        <span>({summary.ratingCount} reseñas)</span>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">Pedidos que necesitan atención</h2>
          <Link href="/negocio/pedidos" className="text-sm font-medium text-neutral-900 underline">
            Ver todos
          </Link>
        </div>
        {summary.recentOrderItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">
            No tenés pedidos pendientes ahora mismo.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {summary.recentOrderItems.map((item) => (
              <OrderItemCard key={item.id} item={item} statusLabel={STATUS_LABEL[item.status] ?? item.status} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
      <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">{icon}</span>
      <p className="text-lg font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
