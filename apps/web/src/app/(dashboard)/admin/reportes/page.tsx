import { ReportRow } from "@/components/admin/report-row";
import { listAdminReports } from "@/lib/services/admin-report-service";

export default async function AdminReportsPage() {
  const reports = await listAdminReports();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Reportes</h1>
        <p className="text-sm text-neutral-500">{reports.length} reportes en total.</p>
      </div>

      <div className="flex flex-col gap-3">
        {reports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
            No hay reportes todavía.
          </p>
        ) : (
          reports.map((report) => <ReportRow key={report.id} report={report} />)
        )}
      </div>
    </div>
  );
}
