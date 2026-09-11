import { Suspense } from "react";
import { DataTable } from "@/components/dashboard/data-table";
import { BusinessFilters } from "@/components/admin/business-filters";
import { BusinessRow } from "@/components/admin/business-row";
import { listAdminBusinesses } from "@/lib/services/admin-business-service";
import type { BusinessStatus } from "@mimo/types";

const COLUMNS = [
  { label: "Negocio" },
  { label: "Estado" },
  { label: "Dueño" },
  { label: "Ubicación" },
  { label: "Productos" },
  { label: "Comisión" },
  { label: "Verificado" },
  { label: "", className: "text-right" },
];

const STATUSES: BusinessStatus[] = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"];

export default async function AdminBusinessesPage({ searchParams }: PageProps<"/admin/negocios">) {
  const rawParams = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  const status = flat.estado && STATUSES.includes(flat.estado as BusinessStatus) ? (flat.estado as BusinessStatus) : undefined;

  const businesses = await listAdminBusinesses({ q: flat.q, status });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Negocios</h1>
        <p className="text-sm text-neutral-500">{businesses.length} negocios.</p>
      </div>

      <Suspense fallback={null}>
        <BusinessFilters />
      </Suspense>

      <DataTable columns={COLUMNS} isEmpty={businesses.length === 0} emptyMessage="No encontramos negocios con esos filtros.">
        {businesses.map((business) => (
          <BusinessRow key={business.id} business={business} />
        ))}
      </DataTable>
    </div>
  );
}
