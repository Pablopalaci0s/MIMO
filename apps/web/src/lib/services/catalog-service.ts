import { prisma } from "@mimo/database";
import type { CategoryDTO, OccasionDTO } from "@mimo/types";

/**
 * Lecturas de catálogo compartidas entre Server Components (home) y, en la
 * Fase 3, las rutas `/api/categories` y `/api/recommendations` — un solo
 * lugar que consulta Prisma en lugar de repetir la query en cada página.
 */
export async function listCategories(): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: "asc" },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    emoji: category.emoji,
    parentId: category.parentId,
  }));
}

export async function listEmotions(): Promise<OccasionDTO[]> {
  const emotions = await prisma.occasion.findMany({
    where: { type: "EMOTION" },
    orderBy: { name: "asc" },
  });

  return emotions.map((emotion) => ({
    id: emotion.id,
    name: emotion.name,
    slug: emotion.slug,
    emoji: emotion.emoji,
    type: emotion.type,
  }));
}
