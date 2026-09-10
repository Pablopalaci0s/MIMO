import { CoverageRequestRow } from "@/components/admin/coverage-request-row";
import { listAdminCoverageRequests } from "@/lib/services/delivery-coverage-service";

export default async function AdminCoverageRequestsPage() {
  const requests = await listAdminCoverageRequests();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Cobertura</h1>
        <p className="text-sm text-neutral-500">
          {requests.length} pedidos de cobertura — zonas donde alguien quiso comprar pero el negocio no llegaba.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
            No hay pedidos de cobertura todavía.
          </p>
        ) : (
          requests.map((request) => <CoverageRequestRow key={request.id} request={request} />)
        )}
      </div>
    </div>
  );
}
