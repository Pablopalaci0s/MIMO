import { prisma } from "@mimo/database";
import type { AdminStatsDTO } from "@mimo/types";
import { assertRole, auth } from "@mimo/auth";
import { AppError } from "@/lib/errors";

/**
 * Punto de entrada único para cada ruta de `/api/admin/*` y cada página de
 * `/admin/*` — solo ADMIN pasa (a diferencia de `requireBusinessId`, acá no
 * hay excepción posible: assertRole(role, ["ADMIN"]) rechaza a BUSINESS/USER).
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  assertRole(session?.user?.role, ["ADMIN"]);
  return session!.user.id;
}

/**
 * Ver, rechazar o borrar los documentos de identidad de un negocio (DUI) NO
 * lo puede hacer cualquier admin: hace falta además el permiso
 * `canReviewDocuments`, que solo otorga otro admin que ya lo tiene. Se lee de
 * la base en cada llamada (no del JWT) para que quitarlo surta efecto al
 * instante.
 */
export async function requireDocumentReviewer(): Promise<string> {
  const adminId = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: adminId }, select: { canReviewDocuments: true } });
  if (!user?.canReviewDocuments) {
    throw new AppError(
      "DOCUMENT_REVIEW_FORBIDDEN",
      "No tenés permiso para ver documentos de identidad. Pedile a un administrador autorizado que te lo otorgue.",
      403,
    );
  }
  return adminId;
}

export async function getAdminStats(): Promise<AdminStatsDTO> {
  const [
    totalUsers,
    totalBusinesses,
    pendingBusinesses,
    suspendedBusinesses,
    totalOrders,
    revenueAgg,
    pendingReports,
    pendingReviews,
    pendingCoverageRequests,
    pendingSupport,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.business.count({ where: { status: "SUSPENDED", deletedAt: null } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.coverageRequest.count({ where: { status: "OPEN" } }),
    prisma.supportConversation.count({ where: { status: "WAITING_AGENT" } }),
  ]);

  return {
    totalUsers,
    totalBusinesses,
    pendingBusinesses,
    suspendedBusinesses,
    totalOrders,
    totalRevenue: Number(revenueAgg._sum.total ?? 0),
    pendingReports,
    pendingReviews,
    pendingCoverageRequests,
    pendingSupport,
  };
}
