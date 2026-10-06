import type { AdminActionLogDTO } from "@mimo/types";
import { listAdminActionLogs } from "@/lib/services/admin-audit-service";

const ACTION_LABEL: Record<string, string> = {
  "user.update": "Actualizó un usuario",
  "business.update": "Actualizó un negocio",
  "business.document.view": "Abrió un documento de verificación de un negocio",
  "business.document.reject": "Rechazó un documento de verificación de un negocio",
  "business.document.delete": "Borró los documentos de verificación de un negocio",
  "business.identity.verify": "Verificó la identidad del titular de un negocio",
  "business.identity.purge_scheduled": "Se programó el borrado de las imágenes de identidad de un negocio",
  "business.identity.images_deleted": "Se borraron las imágenes de identidad de un negocio (automático)",
  "business.documents.purge_scheduled": "Se programó el borrado de los documentos de un negocio rechazado",
  "business.documents.purged": "Se borraron los documentos de un negocio por vencer su plazo (automático)",
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
  "support.reply": "Respondió una consulta de soporte",
  "support.resolve": "Resolvió una consulta de soporte",
  "support.reopen": "Reabrió una consulta de soporte",
  "ticket.created": "Se creó un ticket de soporte",
  "ticket.assigned": "Se asignó un ticket de soporte",
  "ticket.reassigned": "Se reasignó un ticket de soporte",
  "ticket.released": "Se liberó un ticket de soporte",
  "ticket.status_changed": "Cambió el estado de un ticket de soporte",
  "ticket.priority_changed": "Cambió la prioridad de un ticket de soporte",
  "ticket.category_changed": "Cambió la categoría de un ticket de soporte",
  "ticket.order_linked": "Vinculó un pedido a un ticket de soporte",
  "ticket.order_unlinked": "Desvinculó un pedido de un ticket de soporte",
  "ticket.business_linked": "Vinculó un negocio a un ticket de soporte",
  "ticket.business_unlinked": "Desvinculó un negocio de un ticket de soporte",
  "ticket.escalated": "Escaló un ticket de soporte",
  "ticket.message_sent": "Respondió a un cliente en un ticket de soporte",
  "ticket.note_added": "Agregó una nota interna a un ticket de soporte",
  "ticket.address_viewed": "Mostró la dirección de entrega de un pedido en un ticket",
  "ticket.resolved": "Resolvió un ticket de soporte",
  "ticket.closed": "Cerró un ticket de soporte",
  "ticket.reopened": "Reabrió un ticket de soporte",
  "ticket.rated": "El cliente calificó la atención de un ticket",
  "support.message.redacted": "Se ocultó un dato sensible (DUI o tarjeta) en un mensaje de soporte",
  "support.username_set": "Eligió su nombre de usuario de soporte",
  "support.category.created": "Creó una categoría de soporte",
  "support.category.updated": "Editó una categoría de soporte",
  "support.macro.created": "Creó una respuesta rápida de soporte",
  "support.macro.updated": "Editó una respuesta rápida de soporte",
  "support.macro.deleted": "Eliminó una respuesta rápida de soporte",
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
          Registro de acciones sensibles hechas por administradores y personal de soporte (últimas {logs.length}).
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
