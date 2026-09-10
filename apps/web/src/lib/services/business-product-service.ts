import { Prisma, prisma } from "@mimo/database";
import type { BusinessProductDTO, BusinessProductInput } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";

const BUSINESS_PRODUCT_INCLUDE = {
  images: { orderBy: { position: "asc" as const } },
} satisfies Prisma.ProductInclude;

type BusinessProductRow = Prisma.ProductGetPayload<{ include: typeof BUSINESS_PRODUCT_INCLUDE }>;

function toBusinessProductDTO(product: BusinessProductRow, categorySlug: string): BusinessProductDTO {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    categoryId: product.categoryId,
    categorySlug,
    stock: product.stock,
    isPersonalizable: product.isPersonalizable,
    availableToday: product.availableToday,
    preparationTimeMinutes: product.preparationTimeMinutes,
    status: product.status,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      position: image.position,
    })),
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    salesCount: product.salesCount,
    createdAt: product.createdAt.toISOString(),
  };
}

async function uniqueProductSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "producto";
  let candidate = base;
  let suffix = 1;
  // Los slugs de producto son públicos (/productos/[slug]) — evitar
  // colisiones entre negocios distintos que vendan algo con el mismo nombre.
  while (
    await prisma.product.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function listBusinessProducts(businessId: string): Promise<BusinessProductDTO[]> {
  const products = await prisma.product.findMany({
    where: { businessId, deletedAt: null },
    include: { ...BUSINESS_PRODUCT_INCLUDE, category: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map((product) => toBusinessProductDTO(product, product.category.slug));
}

export async function getBusinessProductById(
  businessId: string,
  productId: string,
): Promise<BusinessProductDTO | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId, deletedAt: null },
    include: { ...BUSINESS_PRODUCT_INCLUDE, category: true },
  });
  return product ? toBusinessProductDTO(product, product.category.slug) : null;
}

export async function createBusinessProduct(
  businessId: string,
  input: BusinessProductInput,
): Promise<BusinessProductDTO> {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new AppError("CATEGORY_NOT_FOUND", "Esa categoría no existe.", 400);

  const slug = await uniqueProductSlug(input.name);
  const product = await prisma.product.create({
    data: {
      businessId,
      categoryId: input.categoryId,
      name: input.name,
      slug,
      description: input.description,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      stock: input.stock,
      isPersonalizable: input.isPersonalizable,
      availableToday: input.availableToday,
      preparationTimeMinutes: input.preparationTimeMinutes,
      status: input.status,
      images: {
        create: input.images.map((image, position) => ({
          url: image.url,
          altText: image.altText,
          position,
        })),
      },
    },
    include: { ...BUSINESS_PRODUCT_INCLUDE, category: true },
  });
  return toBusinessProductDTO(product, product.category.slug);
}

export async function updateBusinessProduct(
  businessId: string,
  productId: string,
  input: BusinessProductInput,
): Promise<BusinessProductDTO> {
  const existing = await prisma.product.findFirst({ where: { id: productId, businessId, deletedAt: null } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese producto en tu negocio.", 404);

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new AppError("CATEGORY_NOT_FOUND", "Esa categoría no existe.", 400);

  const slug = existing.name === input.name ? existing.slug : await uniqueProductSlug(input.name, productId);

  const product = await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId } });
    return tx.product.update({
      where: { id: productId },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        stock: input.stock,
        isPersonalizable: input.isPersonalizable,
        availableToday: input.availableToday,
        preparationTimeMinutes: input.preparationTimeMinutes,
        status: input.status,
        images: {
          create: input.images.map((image, position) => ({
            url: image.url,
            altText: image.altText,
            position,
          })),
        },
      },
      include: { ...BUSINESS_PRODUCT_INCLUDE, category: true },
    });
  });

  return toBusinessProductDTO(product, product.category.slug);
}

/** Soft delete — igual que el resto del catálogo (`deletedAt`), nunca se
 * borra un producto que ya pudo haber sido parte de un pedido histórico. */
export async function deleteBusinessProduct(businessId: string, productId: string): Promise<void> {
  const existing = await prisma.product.findFirst({ where: { id: productId, businessId, deletedAt: null } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese producto en tu negocio.", 404);

  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });
}
