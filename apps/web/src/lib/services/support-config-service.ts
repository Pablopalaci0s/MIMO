import { prisma } from "@mimo/database";
import type { SupportCategoryDTO, SupportMacroDTO } from "@mimo/types";
import type { z } from "zod";
import type {
  supportCategoryInputSchema,
  supportCategoryUpdateSchema,
  supportMacroInputSchema,
  supportMacroUpdateSchema,
} from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";
import type { StaffActor } from "@/lib/support/ticket-rules";
import { logAdminAction } from "./admin-audit-service";

/**
 * Categorías de ticket y respuestas rápidas ("macros"). Leer es de todo el
 * personal de soporte; crear/editar es solo de supervisión (las rutas exigen
 * `requireSupportStaff({ manager: true })`). Las categorías son una tabla: se
 * agregan o desactivan sin tocar código, y nunca se borran (los tickets
 * viejos las siguen referenciando).
 */

type CategoryInput = z.infer<typeof supportCategoryInputSchema>;
type CategoryUpdate = z.infer<typeof supportCategoryUpdateSchema>;
type MacroInput = z.infer<typeof supportMacroInputSchema>;
type MacroUpdate = z.infer<typeof supportMacroUpdateSchema>;

function toCategoryDTO(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  defaultPriority: SupportCategoryDTO["defaultPriority"];
  isActive: boolean;
  position: number;
}): SupportCategoryDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    defaultPriority: row.defaultPriority,
    isActive: row.isActive,
    position: row.position,
  };
}

export async function listCategories(options: { includeInactive?: boolean } = {}): Promise<SupportCategoryDTO[]> {
  const rows = await prisma.supportCategory.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return rows.map(toCategoryDTO);
}

async function uniqueCategorySlug(name: string): Promise<string> {
  const base = slugify(name).replace(/-/g, "_") || "categoria";
  let candidate = base;
  let suffix = 1;
  while (await prisma.supportCategory.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
  return candidate;
}

export async function createCategory(actor: StaffActor, input: CategoryInput): Promise<SupportCategoryDTO> {
  const row = await prisma.supportCategory.create({
    data: {
      slug: await uniqueCategorySlug(input.name),
      name: input.name,
      description: input.description ?? null,
      defaultPriority: input.defaultPriority,
      isActive: input.isActive,
      position: input.position,
    },
  });
  await logAdminAction({ adminId: actor.id, action: "support.category.created", targetType: "SUPPORT_CATEGORY", targetId: row.id, metadata: { slug: row.slug } });
  return toCategoryDTO(row);
}

export async function updateCategory(actor: StaffActor, id: string, input: CategoryUpdate): Promise<SupportCategoryDTO> {
  const existing = await prisma.supportCategory.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa categoría.", 404);

  // Siempre tiene que quedar al menos una categoría activa: es donde cae lo que no se puede clasificar.
  if (input.isActive === false && existing.isActive) {
    const otherActive = await prisma.supportCategory.count({ where: { isActive: true, id: { not: id } } });
    if (otherActive === 0) throw new AppError("LAST_CATEGORY", "Tiene que quedar al menos una categoría activa.", 400);
  }

  const row = await prisma.supportCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.defaultPriority !== undefined ? { defaultPriority: input.defaultPriority } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
  });
  await logAdminAction({
    adminId: actor.id,
    action: "support.category.updated",
    targetType: "SUPPORT_CATEGORY",
    targetId: id,
    metadata: { slug: row.slug, isActive: row.isActive },
  });
  return toCategoryDTO(row);
}

// ───────────────────────────── macros ─────────────────────────────

const MACRO_INCLUDE = { category: { select: { name: true } } } as const;

function toMacroDTO(row: {
  id: string;
  title: string;
  body: string;
  categoryId: string | null;
  isActive: boolean;
  category: { name: string } | null;
}): SupportMacroDTO {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    isActive: row.isActive,
  };
}

export async function listMacros(options: { includeInactive?: boolean } = {}): Promise<SupportMacroDTO[]> {
  const rows = await prisma.supportMacro.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    include: MACRO_INCLUDE,
    orderBy: { title: "asc" },
  });
  return rows.map(toMacroDTO);
}

async function assertCategoryExists(categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const found = await prisma.supportCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!found) throw new AppError("INVALID_CATEGORY", "Esa categoría no existe.", 400);
}

export async function createMacro(actor: StaffActor, input: MacroInput): Promise<SupportMacroDTO> {
  await assertCategoryExists(input.categoryId);
  const row = await prisma.supportMacro.create({
    data: {
      title: input.title,
      body: input.body,
      categoryId: input.categoryId ?? null,
      isActive: input.isActive,
      createdById: actor.id,
    },
    include: MACRO_INCLUDE,
  });
  await logAdminAction({ adminId: actor.id, action: "support.macro.created", targetType: "SUPPORT_MACRO", targetId: row.id });
  return toMacroDTO(row);
}

export async function updateMacro(actor: StaffActor, id: string, input: MacroUpdate): Promise<SupportMacroDTO> {
  const existing = await prisma.supportMacro.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa respuesta rápida.", 404);
  await assertCategoryExists(input.categoryId);

  const row = await prisma.supportMacro.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: MACRO_INCLUDE,
  });
  await logAdminAction({ adminId: actor.id, action: "support.macro.updated", targetType: "SUPPORT_MACRO", targetId: id });
  return toMacroDTO(row);
}

export async function deleteMacro(actor: StaffActor, id: string): Promise<void> {
  const result = await prisma.supportMacro.deleteMany({ where: { id } });
  if (result.count === 0) throw new AppError("NOT_FOUND", "No encontramos esa respuesta rápida.", 404);
  await logAdminAction({ adminId: actor.id, action: "support.macro.deleted", targetType: "SUPPORT_MACRO", targetId: id });
}
