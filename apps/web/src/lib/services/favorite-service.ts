import { prisma } from "@mimo/database";
import type { FavoriteIdsDTO, FavoritesListDTO, FavoriteTargetType } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { PRODUCT_LIST_INCLUDE, toProductSummaryDTO } from "./product-service";
import { toBusinessSummaryDTO } from "./business-service";

/** IDs favoritos del usuario — liviano, pensado para hidratar el estado del
 * corazón en listas de productos/negocios sin pedir un DTO completo por
 * cada card (evita N+1 en el catálogo/home). */
export async function listFavoriteIds(userId: string): Promise<FavoriteIdsDTO> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: { productId: true, businessId: true },
  });
  return {
    productIds: favorites.map((f) => f.productId).filter((id): id is string => id !== null),
    businessIds: favorites.map((f) => f.businessId).filter((id): id is string => id !== null),
  };
}

export async function listFavorites(userId: string): Promise<FavoritesListDTO> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      product: { include: PRODUCT_LIST_INCLUDE },
      business: { include: { municipality: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    products: favorites
      .filter((f) => f.targetType === "PRODUCT" && f.product && f.product.deletedAt === null)
      .map((f) => toProductSummaryDTO(f.product!)),
    businesses: favorites
      .filter((f) => f.targetType === "BUSINESS" && f.business && f.business.deletedAt === null)
      .map((f) => toBusinessSummaryDTO(f.business!)),
  };
}

/** Toggle simple: si ya existe, lo saca de favoritos; si no, lo agrega.
 * Devuelve el estado resultante para que el botón no tenga que adivinar. */
export async function toggleFavorite(
  userId: string,
  targetType: FavoriteTargetType,
  targetId: string,
): Promise<{ favorited: boolean }> {
  if (targetType === "PRODUCT") {
    const product = await prisma.product.findFirst({ where: { id: targetId, deletedAt: null } });
    if (!product) throw new AppError("NOT_FOUND", "No encontramos ese producto.", 404);

    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId: targetId } },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await prisma.favorite.create({
      data: { userId, targetType: "PRODUCT", productId: targetId },
    });
    return { favorited: true };
  }

  const business = await prisma.business.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!business) throw new AppError("NOT_FOUND", "No encontramos ese negocio.", 404);

  const existing = await prisma.favorite.findUnique({
    where: { userId_businessId: { userId, businessId: targetId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  await prisma.favorite.create({
    data: { userId, targetType: "BUSINESS", businessId: targetId },
  });
  return { favorited: true };
}
