import { BusinessRow } from "@/components/admin/business-row";
import { listAdminBusinesses } from "@/lib/services/admin-business-service";

export default async function AdminBusinessesPage() {
  const businesses = await listAdminBusinesses();

  return (
    <div className="flex flex-col gap-3">
      {businesses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
          No hay negocios registrados todavía.
        </p>
      ) : (
        businesses.map((business) => <BusinessRow key={business.id} business={business} />)
      )}
    </div>
  );
}
