import { prisma } from "@mimo/database";
import type { BusinessDashboardSummaryDTO } from "@mimo/types";
import { listBusinessOrderItems } from "./business-order-service";

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

async function sumSalesSince(businessId: string, since: Date): Promise<number> {
  const items = await prisma.orderItem.findMany({
    where: { businessId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: { unitPrice: true, quantity: true },
  });
  return items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
}

export async function getBusinessDashboardSummary(businessId: string): Promise<BusinessDashboardSummaryDTO> {
  const now = new Date();

  const [business, pendingOrderItems, activeProducts, todaySales, monthSales, recentOrderItems] =
    await Promise.all([
      prisma.business.findUniqueOrThrow({
        where: { id: businessId },
        select: { name: true, slug: true, status: true, ratingAvg: true, ratingCount: true },
      }),
      prisma.orderItem.count({ where: { businessId, status: "PENDING" } }),
      prisma.product.count({ where: { businessId, status: "ACTIVE", deletedAt: null } }),
      sumSalesSince(businessId, startOfDayUtc(now)),
      sumSalesSince(businessId, startOfMonthUtc(now)),
      listBusinessOrderItems(businessId),
    ]);

  return {
    businessName: business.name,
    businessSlug: business.slug,
    status: business.status,
    pendingOrderItems,
    todaySales,
    monthSales,
    activeProducts,
    ratingAvg: business.ratingAvg,
    ratingCount: business.ratingCount,
    recentOrderItems: recentOrderItems
      .filter((item) => item.status !== "DELIVERED" && item.status !== "CANCELLED")
      .slice(0, 6),
  };
}
