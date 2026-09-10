import { Prisma, prisma } from "@mimo/database";
import type { AdminCategoryDTO, AdminCategoryInput } from "@mimo/types";
import { AppError } from "@/lib/errors";

const ADMIN_CATEGORY_INCLUDE = {
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

type AdminCategoryRow = Prisma.CategoryGetPayload<{ include: typeof ADMIN_CATEGORY_INCLUDE }>;

function toAdminCategoryDTO(category: AdminCategoryRow): AdminCategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    emoji: category.emoji,
    parentId: category.parentId,
    position: category.position,
    productCount: category._count.products,
  };
}

export async function listAdminCategories(): Promise<AdminCategoryDTO[]> {
  const categories = await prisma.category.findMany({
    include: ADMIN_CATEGORY_INCLUDE,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return categories.map(toAdminCategoryDTO);
}

async function assertUniqueSlug(slug: string, excludeId?: string): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (existing) throw new AppError("SLUG_TAKEN", "Ya existe una categoría con ese slug.", 409);
}

export async function createAdminCategory(input: AdminCategoryInput): Promise<AdminCategoryDTO> {
  await assertUniqueSlug(input.slug);
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      emoji: input.emoji || null,
      parentId: input.parentId || null,
      position: input.position,
    },
    include: ADMIN_CATEGORY_INCLUDE,
  });
  return toAdminCategoryDTO(category);
}

export async function updateAdminCategory(
  categoryId: string,
  input: AdminCategoryInput,
): Promise<AdminCategoryDTO> {
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa categoría.", 404);
  if (input.parentId === categoryId) {
    throw new AppError("INVALID_PARENT", "Una categoría no puede ser su propio padre.", 400);
  }
  await assertUniqueSlug(input.slug, categoryId);

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: {
      name: input.name,
      slug: input.slug,
      emoji: input.emoji || null,
      parentId: input.parentId || null,
      position: input.position,
    },
    include: ADMIN_CATEGORY_INCLUDE,
  });
  return toAdminCategoryDTO(category);
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
    include: ADMIN_CATEGORY_INCLUDE,
  });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa categoría.", 404);
  if (existing._count.products > 0) {
    throw new AppError(
      "CATEGORY_IN_USE",
      "No se puede eliminar: todavía tiene productos asignados.",
      409,
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });
}
