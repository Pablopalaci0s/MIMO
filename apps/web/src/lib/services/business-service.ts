import { Prisma, prisma } from "@mimo/database";
import type { BusinessDTO, BusinessSummaryDTO, ProductSummaryDTO } from "@mimo/types";

type BusinessWithMunicipality = Prisma.BusinessGetPayload<{ include: { municipality: true } }>;

export function toBusinessSummaryDTO(business: BusinessWithMunicipality): BusinessSummaryDTO {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    logoUrl: business.logoUrl,
    verified: business.verified,
    isDemo: business.isDemo,
    ratingAvg: business.ratingAvg,
    ratingCount: business.ratingCount,
    municipalityName: business.municipality?.name ?? null,
  };
}

function toBusinessDTO(business: BusinessWithMunicipality): BusinessDTO {
  return {
    ...toBusinessSummaryDTO(business),
    description: business.description,
    coverUrl: business.coverUrl,
    whatsapp: business.whatsapp,
    instagram: business.instagram,
    facebook: business.facebook,
    tiktok: business.tiktok,
    addressLine: business.addressLine,
    openingHours: business.openingHours as BusinessDTO["openingHours"],
    status: business.status,
  };
}

export interface BusinessPageData extends BusinessDTO {
  products: ProductSummaryDTO[];
  deliveryZoneNames: string[];
}

export async function getBusinessBySlug(slug: string): Promise<BusinessPageData | null> {
  const business = await prisma.business.findFirst({
    where: { slug, status: "APPROVED", deletedAt: null },
    include: {
      municipality: true,
      deliveryZones: { where: { isActive: true }, include: { municipality: true } },
      products: {
        where: { status: "ACTIVE", deletedAt: null },
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          business: { include: { municipality: true } },
          category: true,
        },
        orderBy: { salesCount: "desc" },
      },
    },
  });
  if (!business) return null;

  const products: ProductSummaryDTO[] = business.products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    currency: product.currency,
    coverImageUrl: product.images[0]?.url ?? null,
    business: toBusinessSummaryDTO(product.business),
    categorySlug: product.category.slug,
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    availableToday: product.availableToday,
    preparationTimeMinutes: product.preparationTimeMinutes,
    salesCount: product.salesCount,
  }));

  return {
    ...toBusinessDTO(business),
    products,
    deliveryZoneNames: business.deliveryZones.map((zone) => zone.name),
  };
}
