import { Prisma, prisma } from "@mimo/database";
import type { AdminActionLogDTO } from "@mimo/types";

const AUDIT_LOG_INCLUDE = {
  admin: { select: { name: true } },
} satisfies Prisma.AdminActionLogInclude;

type AuditLogRow = Prisma.AdminActionLogGetPayload<{ include: typeof AUDIT_LOG_INCLUDE }>;

function toAdminActionLogDTO(log: AuditLogRow): AdminActionLogDTO {
  return {
    id: log.id,
    adminName: log.admin.name,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    metadata: (log.metadata as Record<string, unknown> | null) ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

/**
 * Escribe un registro de auditoría — se llama desde el mismo *-service.ts
 * que hace el cambio sensible (nunca desde la ruta), para que sea imposible
 * suspender un usuario, aprobar un negocio, etc. sin dejar rastro. Nunca
 * debe poder tumbar la operación que audita: si falla, se loguea a consola
 * y se sigue de largo en vez de propagar el error.
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonObject;
}): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        metadata: params.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[admin-audit] no se pudo registrar la acción", params.action, error);
  }
}

export async function listAdminActionLogs(limit = 200): Promise<AdminActionLogDTO[]> {
  const logs = await prisma.adminActionLog.findMany({
    include: AUDIT_LOG_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return logs.map(toAdminActionLogDTO);
}
