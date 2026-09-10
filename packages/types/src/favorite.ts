import type { BusinessSummaryDTO, ProductSummaryDTO } from "./catalog";

export type FavoriteTargetType = "PRODUCT" | "BUSINESS";

export interface FavoriteIdsDTO {
  productIds: string[];
  businessIds: string[];
}

export interface FavoritesListDTO {
  products: ProductSummaryDTO[];
  businesses: BusinessSummaryDTO[];
}

export interface FavoriteToggleInput {
  targetType: FavoriteTargetType;
  targetId: string;
}
