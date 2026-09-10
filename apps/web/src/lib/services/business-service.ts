import { Prisma, prisma } from "@mimo/database";
import type { BusinessDTO, BusinessSummaryDTO, FeaturedBusinessDTO, ProductSummaryDTO } from "@mimo/types";
import { assertRole, auth } from "@mimo/auth";
import { AppError } from "@/lib/errors";

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
    phone: business.phone,
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

/**
 * Negocios destacados para el home — ordenados por mejor calificación, sin
 * inventar promociones ni datos que no existan (sección 5 de las reglas del
 * usuario). El costo/tiempo de envío es el de su zona de entrega más barata.
 */
export async function listFeaturedBusinesses(limit = 6): Promise<FeaturedBusinessDTO[]> {
  const businesses = await prisma.business.findMany({
    where: { status: "APPROVED", deletedAt: null },
    include: {
      municipality: true,
      deliveryZones: { where: { isActive: true }, orderBy: { deliveryFee: "asc" }, take: 1 },
      products: {
        where: { status: "ACTIVE", deletedAt: null },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { salesCount: "desc" },
        take: 1,
      },
    },
    orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
    take: limit,
  });

  return businesses.map((business) => ({
    ...toBusinessSummaryDTO(business),
    coverUrl: business.coverUrl,
    previewImageUrl: business.products[0]?.images[0]?.url ?? null,
    description: business.description,
    deliveryFee: business.deliveryZones[0] ? Number(business.deliveryZones[0].deliveryFee) : null,
    estimatedMinutes: business.deliveryZones[0]?.estimatedMinutes ?? null,
  }));
}

/**
 * Resuelve el negocio del panel `/negocio` a partir de la sesión — nunca se
 * confía en un `businessId` mandado por el cliente. Un usuario puede tener
 * a lo sumo una membresía relevante hoy (el flujo de alta de negocios llega
 * en una fase futura); si tiene varias, se usa la más antigua.
 */
export async function getBusinessIdForUser(userId: string): Promise<string> {
  const membership = await prisma.businessUser.findFirst({
    where: { userId },
    select: { businessId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    throw new AppError(
      "NO_BUSINESS",
      "Tu cuenta no está vinculada a ningún negocio todavía.",
      403,
    );
  }
  return membership.businessId;
}

/**
 * Punto de entrada único para cada ruta de `/api/negocio/*` y cada página de
 * `/negocio/*`: valida sesión + rol (ADMIN pasa igual que BUSINESS, ver
 * `assertRole`) y resuelve el `businessId` real desde la base de datos, para
 * que ningún handler tenga que repetir esta lógica ni confiar en un id que
 * venga del cliente.
 */
export async function requireBusinessId(): Promise<string> {
  const session = await auth();
  assertRole(session?.user?.role, ["BUSINESS"]);
  return getBusinessIdForUser(session!.user.id);
}
