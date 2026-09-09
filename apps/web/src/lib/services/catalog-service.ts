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

  return emotions.map(toOccasionDTO);
}

export async function listOccasions(): Promise<OccasionDTO[]> {
  const occasions = await prisma.occasion.findMany({
    where: { type: "OCCASION" },
    orderBy: { name: "asc" },
  });

  return occasions.map(toOccasionDTO);
}

function toOccasionDTO(occasion: {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  type: OccasionDTO["type"];
}): OccasionDTO {
  return {
    id: occasion.id,
    name: occasion.name,
    slug: occasion.slug,
    emoji: occasion.emoji,
    type: occasion.type,
  };
}
