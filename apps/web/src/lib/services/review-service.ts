import { Prisma, prisma } from "@mimo/database";
import type { ReviewableItemDTO, ReviewDTO, ReviewInput } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { createNotification } from "./notification-service";

function toReviewDTO(review: Prisma.ReviewGetPayload<{ include: { user: true } }>): ReviewDTO {
  return {
    id: review.id,
    userName: review.user.name,
    productRating: review.productRating,
    businessRating: review.businessRating,
    deliveryRating: review.deliveryRating,
    comment: review.comment,
    images: review.images,
    createdAt: review.createdAt.toISOString(),
  };
}

/** Reseñas ya aprobadas por un admin (Fase 6) — nunca se muestran
 * públicamente reseñas PENDING/REJECTED. */
export async function listApprovedReviews(target: {
  productId?: string;
  businessId?: string;
}): Promise<ReviewDTO[]> {
  const reviews = await prisma.review.findMany({
    where: {
      status: "APPROVED",
      ...(target.productId ? { productId: target.productId } : {}),
      ...(target.businessId ? { businessId: target.businessId } : {}),
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map(toReviewDTO);
}

/**
 * Ítems entregados del usuario que todavía no tiene reseñados — la única
 * fuente para decidir qué mostrar como "dejar reseña" (sección 26: solo
 * compradores que completaron la compra pueden reseñar).
 */
export async function listReviewableOrderItems(userId: string): Promise<ReviewableItemDTO[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: { buyerId: userId }, status: "DELIVERED" },
    include: {
      order: true,
      product: { include: { images: { orderBy: { position: "asc" }, take: 1 }, business: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const existingReviews = await prisma.review.findMany({
    where: { userId, orderId: { in: items.map((item) => item.orderId) } },
    select: { orderId: true, productId: true },
  });
  const reviewed = new Set(existingReviews.map((r) => `${r.orderId}:${r.productId ?? ""}`));

  return items
    .filter((item) => !reviewed.has(`${item.orderId}:${item.productId}`))
    .map((item) => ({
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      productId: item.productId,
      productName: item.product.name,
      productImageUrl: item.product.images[0]?.url ?? null,
      businessId: item.businessId,
      businessName: item.product.business.name,
    }));
}

export async function createReview(userId: string, input: ReviewInput): Promise<ReviewDTO> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, buyerId: userId },
    include: { items: true },
  });
  if (!order) throw new AppError("NOT_FOUND", "No encontramos ese pedido.", 404);

  if (input.productId) {
    const deliveredItem = order.items.find(
      (item) => item.productId === input.productId && item.status === "DELIVERED",
    );
    if (!deliveredItem) {
      throw new AppError(
        "NOT_REVIEWABLE",
        "Solo podés reseñar productos de pedidos que ya te entregaron.",
        400,
      );
    }
  } else if (input.businessId) {
    const deliveredFromBusiness = order.items.some(
      (item) => item.businessId === input.businessId && item.status === "DELIVERED",
    );
    if (!deliveredFromBusiness) {
      throw new AppError(
        "NOT_REVIEWABLE",
        "Solo podés reseñar negocios de pedidos que ya te entregaron.",
        400,
      );
    }
  }

  const existing = await prisma.review.findFirst({
    where: { userId, orderId: input.orderId, productId: input.productId ?? null },
  });
  if (existing) {
    throw new AppError("ALREADY_REVIEWED", "Ya dejaste una reseña para este producto.", 409);
  }

  const review = await prisma.review.create({
    data: {
      userId,
      orderId: input.orderId,
      productId: input.productId,
      businessId: input.businessId,
      productRating: input.productRating,
      businessRating: input.businessRating,
      deliveryRating: input.deliveryRating,
      comment: input.comment,
      images: input.images ?? [],
      status: "PENDING",
    },
    include: { user: true },
  });

  const targetBusinessId =
    input.businessId ?? order.items.find((item) => item.productId === input.productId)?.businessId;
  if (targetBusinessId) {
    const owner = await prisma.businessUser.findFirst({
      where: { businessId: targetBusinessId, role: "OWNER" },
      select: { userId: true, business: { select: { name: true } } },
    });
    if (owner) {
      await createNotification({
        userId: owner.userId,
        type: "REVIEW_RECEIVED",
        title: "Recibiste una reseña nueva",
        body: `${review.user.name} dejó una reseña para ${owner.business.name}.`,
        linkHref: "/negocio",
      });
    }
  }

  return toReviewDTO(review);
}
