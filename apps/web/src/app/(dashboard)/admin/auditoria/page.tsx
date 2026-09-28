import type { AdminActionLogDTO } from "@mimo/types";
import { listAdminActionLogs } from "@/lib/services/admin-audit-service";

const ACTION_LABEL: Record<string, string> = {
  "user.update": "Actualizó un usuario",
  "business.update": "Actualizó un negocio",
  "review.update_status": "Moderó una reseña",
  "report.update_status": "Resolvió un reporte",
  "coupon.create": "Creó un cupón",
  "coupon.update": "Editó un cupón",
  "coupon.delete": "Eliminó un cupón",
  "category.create": "Creó una categoría",
  "category.update": "Editó una categoría",
  "category.delete": "Eliminó una categoría",
  "banner.create": "Creó un banner",
  "banner.update": "Editó un banner",
  "banner.delete": "Eliminó un banner",
};

function formatMetadata(metadata: AdminActionLogDTO["metadata"]): string | null {
  if (!metadata) return null;
  const parts = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${String(value)}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function AdminAuditLogPage() {
  const logs = await listAdminActionLogs();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Auditoría</h1>
        <p className="text-sm text-neutral-500">
          Registro de acciones sensibles hechas por administradores (últimas {logs.length}).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
            Todavía no hay acciones registradas.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">
                  {ACTION_LABEL[log.action] ?? log.action}
                  <span className="ml-1.5 font-normal text-neutral-400">
                    ({log.targetType}
                    {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""})
                  </span>
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {log.adminName}
                  {formatMetadata(log.metadata) ? ` — ${formatMetadata(log.metadata)}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-neutral-400">
                {new Date(log.createdAt).toLocaleString("es-SV", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
