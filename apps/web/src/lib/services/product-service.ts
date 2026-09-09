import { Prisma, prisma } from "@mimo/database";
import type { OccasionDTO, Paginated, PaginationParams, ProductDTO, ProductFilters, ProductSummaryDTO } from "@mimo/types";
import { toBusinessSummaryDTO } from "./business-service";

const PRODUCT_LIST_INCLUDE = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  business: { include: { municipality: true } },
  category: true,
} satisfies Prisma.ProductInclude;

type ProductListRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_LIST_INCLUDE }>;

function toProductSummaryDTO(product: ProductListRow): ProductSummaryDTO {
  return {
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
  };
}

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE", deletedAt: null };

  if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }
  if (filters.occasionSlug) {
    where.occasions = { some: { occasion: { slug: filters.occasionSlug } } };
  }
  if (filters.municipalitySlug) {
    where.business = { municipality: { slug: filters.municipalitySlug } };
  }
  if (filters.availableToday) {
    where.availableToday = true;
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: ProductFilters["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }];
    case "price_desc":
      return [{ price: "desc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "sales":
      return [{ salesCount: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

/**
 * Único punto de lectura del catálogo — usado tanto por `/regalos` (Server
 * Component) como por `/api/products` (para la futura app móvil), así que
 * la lógica de filtros/orden vive en un solo lugar (sección 31 del spec).
 */
export async function listProducts(
  filters: ProductFilters,
  pagination: PaginationParams = {},
): Promise<Paginated<ProductSummaryDTO>> {
  const page = Math.max(pagination.page ?? 1, 1);
  const pageSize = Math.min(Math.max(pagination.pageSize ?? 24, 1), 60);
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_LIST_INCLUDE,
      orderBy: buildOrderBy(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(toProductSummaryDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      images: { orderBy: { position: "asc" } },
      business: { include: { municipality: true } },
      category: true,
      occasions: { include: { occasion: true } },
    },
  });
  if (!product) return null;

  const occasions: OccasionDTO[] = product.occasions.map(({ occasion }) => ({
    id: occasion.id,
    name: occasion.name,
    slug: occasion.slug,
    emoji: occasion.emoji,
    type: occasion.type,
  }));

  return {
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
    description: product.description,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      position: image.position,
    })),
    isPersonalizable: product.isPersonalizable,
    stock: product.stock,
    occasions,
  };
}

export async function listRelatedProducts(
  productId: string,
  categorySlug: string,
  limit = 4,
): Promise<ProductSummaryDTO[]> {
  const rows = await prisma.product.findMany({
    where: {
      category: { slug: categorySlug },
      id: { not: productId },
      status: "ACTIVE",
      deletedAt: null,
    },
    include: PRODUCT_LIST_INCLUDE,
    orderBy: [{ salesCount: "desc" }],
    take: limit,
  });
  return rows.map(toProductSummaryDTO);
}
