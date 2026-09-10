import { DataTable } from "@/components/dashboard/data-table";
import { BusinessRow } from "@/components/admin/business-row";
import { listAdminBusinesses } from "@/lib/services/admin-business-service";

const COLUMNS = [
  { label: "Negocio" },
  { label: "Estado" },
  { label: "Dueño" },
  { label: "Ubicación" },
  { label: "Productos" },
  { label: "Verificado" },
  { label: "", className: "text-right" },
];

export default async function AdminBusinessesPage() {
  const businesses = await listAdminBusinesses();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Negocios</h1>
        <p className="text-sm text-neutral-500">{businesses.length} negocios registrados.</p>
      </div>

      <DataTable columns={COLUMNS} isEmpty={businesses.length === 0} emptyMessage="No hay negocios registrados todavía.">
        {businesses.map((business) => (
          <BusinessRow key={business.id} business={business} />
        ))}
      </DataTable>
    </div>
  );
}
