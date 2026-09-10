import { prisma } from "@mimo/database";
import type { AdminStatsDTO } from "@mimo/types";
import { assertRole, auth } from "@mimo/auth";

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
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.business.count({ where: { status: "SUSPENDED", deletedAt: null } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
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
  };
}
