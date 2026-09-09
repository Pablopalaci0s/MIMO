import type { ProductSummaryDTO } from "@mimo/types";
import type { ScorableProduct } from "./scoring";

export function toProductSummaryDTO(product: ScorableProduct): ProductSummaryDTO {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    currency: product.currency,
    coverImageUrl: product.images[0]?.url ?? null,
    business: {
      id: product.business.id,
      name: product.business.name,
      slug: product.business.slug,
      logoUrl: product.business.logoUrl,
      verified: product.business.verified,
      isDemo: product.business.isDemo,
      ratingAvg: product.business.ratingAvg,
      ratingCount: product.business.ratingCount,
      municipalityName: null,
    },
    categorySlug: product.category.slug,
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    availableToday: product.availableToday,
    preparationTimeMinutes: product.preparationTimeMinutes,
    salesCount: product.salesCount,
  };
}
