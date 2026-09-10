import { AlertTriangle, Building2, DollarSign, MapPin, MessageSquareWarning, Package, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { getAdminStats } from "@/lib/services/admin-service";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Resumen</h1>
        <p className="text-sm text-neutral-500">El estado de la plataforma en un vistazo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users className="size-5" />} label="Usuarios" value={String(stats.totalUsers)} />
        <StatCard icon={<Building2 className="size-5" />} label="Negocios" value={String(stats.totalBusinesses)} />
        <StatCard
          icon={<AlertTriangle className="size-5" />}
          label="Pendientes de aprobar"
          value={String(stats.pendingBusinesses)}
          highlight={stats.pendingBusinesses > 0}
        />
        <StatCard icon={<Building2 className="size-5" />} label="Suspendidos" value={String(stats.suspendedBusinesses)} />
        <StatCard icon={<Package className="size-5" />} label="Pedidos totales" value={String(stats.totalOrders)} />
        <StatCard icon={<DollarSign className="size-5" />} label="Ventas totales" value={`$${stats.totalRevenue.toFixed(2)}`} />
        <StatCard
          icon={<MessageSquareWarning className="size-5" />}
          label="Reportes abiertos"
          value={String(stats.pendingReports)}
          highlight={stats.pendingReports > 0}
        />
        <StatCard
          icon={<MessageSquareWarning className="size-5" />}
          label="Reseñas por moderar"
          value={String(stats.pendingReviews)}
          highlight={stats.pendingReviews > 0}
        />
        <StatCard
          icon={<MapPin className="size-5" />}
          label="Pedidos de cobertura"
          value={String(stats.pendingCoverageRequests)}
          highlight={stats.pendingCoverageRequests > 0}
        />
      </div>
    </div>
  );
}
