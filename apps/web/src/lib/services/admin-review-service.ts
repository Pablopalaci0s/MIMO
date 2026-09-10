import { Prisma, prisma } from "@mimo/database";
import type { AdminReviewDTO } from "@mimo/types";
import { AppError } from "@/lib/errors";

const REVIEW_INCLUDE = {
  user: true,
  product: true,
  business: true,
} satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

function toAdminReviewDTO(review: ReviewRow): AdminReviewDTO {
  return {
    id: review.id,
    userName: review.user.name,
    productName: review.product?.name ?? null,
    businessName: review.business?.name ?? null,
    productRating: review.productRating,
    businessRating: review.businessRating,
    deliveryRating: review.deliveryRating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
  };
}

export async function listAdminReviews(): Promise<AdminReviewDTO[]> {
  const reviews = await prisma.review.findMany({
    include: REVIEW_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return reviews.map(toAdminReviewDTO);
}

/**
 * Aprobar/rechazar una reseña recalcula el rating agregado del producto y
 * del negocio a partir de las reseñas APPROVED — nunca se confía en un
 * promedio incremental que pueda desincronizarse.
 */
export async function updateAdminReviewStatus(
  reviewId: string,
  status: AdminReviewDTO["status"],
): Promise<AdminReviewDTO> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa reseña.", 404);

  const review = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: { status },
      include: REVIEW_INCLUDE,
    });

    if (updated.productId) {
      await recalculateProductRating(tx, updated.productId);
    }
    if (updated.businessId) {
      await recalculateBusinessRating(tx, updated.businessId);
    }

    return updated;
  });

  return toAdminReviewDTO(review);
}

async function recalculateProductRating(tx: Prisma.TransactionClient, productId: string): Promise<void> {
  const agg = await tx.review.aggregate({
    where: { productId, status: "APPROVED", productRating: { not: null } },
    _avg: { productRating: true },
    _count: { productRating: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: {
      ratingAvg: agg._avg.productRating ?? 0,
      ratingCount: agg._count.productRating,
    },
  });
}

async function recalculateBusinessRating(tx: Prisma.TransactionClient, businessId: string): Promise<void> {
  const agg = await tx.review.aggregate({
    where: { businessId, status: "APPROVED", businessRating: { not: null } },
    _avg: { businessRating: true },
    _count: { businessRating: true },
  });
  await tx.business.update({
    where: { id: businessId },
    data: {
      ratingAvg: agg._avg.businessRating ?? 0,
      ratingCount: agg._count.businessRating,
    },
  });
}
