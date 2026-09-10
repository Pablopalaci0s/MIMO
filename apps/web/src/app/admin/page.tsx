import { AlertTriangle, Building2, DollarSign, MessageSquareWarning, Package, Users } from "lucide-react";
import { getAdminStats } from "@/lib/services/admin-service";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={<Users className="size-4" />} label="Usuarios" value={String(stats.totalUsers)} />
      <StatCard icon={<Building2 className="size-4" />} label="Negocios" value={String(stats.totalBusinesses)} />
      <StatCard
        icon={<AlertTriangle className="size-4" />}
        label="Pendientes de aprobar"
        value={String(stats.pendingBusinesses)}
        highlight={stats.pendingBusinesses > 0}
      />
      <StatCard icon={<Building2 className="size-4" />} label="Suspendidos" value={String(stats.suspendedBusinesses)} />
      <StatCard icon={<Package className="size-4" />} label="Pedidos totales" value={String(stats.totalOrders)} />
      <StatCard icon={<DollarSign className="size-4" />} label="Ventas totales" value={`$${stats.totalRevenue.toFixed(2)}`} />
      <StatCard
        icon={<MessageSquareWarning className="size-4" />}
        label="Reportes abiertos"
        value={String(stats.pendingReports)}
        highlight={stats.pendingReports > 0}
      />
      <StatCard
        icon={<MessageSquareWarning className="size-4" />}
        label="Reseñas por moderar"
        value={String(stats.pendingReviews)}
        highlight={stats.pendingReviews > 0}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
      <span
        className={`flex size-8 items-center justify-center rounded-full ${
          highlight ? "bg-brand-soft text-brand" : "bg-neutral-100 text-neutral-600"
        }`}
      >
        {icon}
      </span>
      <p className="text-lg font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
