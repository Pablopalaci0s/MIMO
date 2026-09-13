import { Prisma, prisma } from "@mimo/database";
import type {
  AddGiftRegistryItemInput,
  GiftRegistryDTO,
  GiftRegistryInput,
  GiftRegistryManageDTO,
  GiftRegistryOwnerItemDTO,
  GiftRegistryPublicDTO,
} from "@mimo/types";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";

const ITEM_INCLUDE = {
  product: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
} satisfies Prisma.GiftRegistryItemInclude;

type ItemRow = Prisma.GiftRegistryItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

function toOwnerItemDTO(item: ItemRow): GiftRegistryOwnerItemDTO {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug,
    productImageUrl: item.product.images[0]?.url ?? null,
    price: Number(item.product.price),
    note: item.note,
    isReserved: item.reservedAt !== null,
    reservedByName: item.reservedByName,
    reservedAt: item.reservedAt?.toISOString() ?? null,
  };
}

async function uniqueRegistrySlug(title: string): Promise<string> {
  const base = slugify(title) || "lista";
  let candidate = base;
  let suffix = 1;
  while (await prisma.giftRegistry.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

function toDataFields(input: GiftRegistryInput) {
  return {
    title: input.title,
    eventType: input.eventType || null,
    eventDate: input.eventDate ? new Date(input.eventDate) : null,
    message: input.message || null,
    isActive: input.isActive,
  };
}

export async function listMyRegistries(userId: string): Promise<GiftRegistryDTO[]> {
  const registries = await prisma.giftRegistry.findMany({
    where: { userId },
    include: { items: { select: { reservedAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  return registries.map((registry) => ({
    id: registry.id,
    slug: registry.slug,
    title: registry.title,
    eventType: registry.eventType,
    eventDate: registry.eventDate?.toISOString() ?? null,
    message: registry.message,
    isActive: registry.isActive,
    itemCount: registry.items.length,
    reservedCount: registry.items.filter((item) => item.reservedAt !== null).length,
    createdAt: registry.createdAt.toISOString(),
  }));
}

export async function createRegistry(userId: string, input: GiftRegistryInput): Promise<GiftRegistryDTO> {
  const slug = await uniqueRegistrySlug(input.title);
  const registry = await prisma.giftRegistry.create({
    data: { userId, slug, ...toDataFields(input) },
  });
  return {
    id: registry.id,
    slug: registry.slug,
    title: registry.title,
    eventType: registry.eventType,
    eventDate: registry.eventDate?.toISOString() ?? null,
    message: registry.message,
    isActive: registry.isActive,
    itemCount: 0,
    reservedCount: 0,
    createdAt: registry.createdAt.toISOString(),
  };
}

async function requireOwnedRegistry(userId: string, registryId: string) {
  const registry = await prisma.giftRegistry.findFirst({ where: { id: registryId, userId } });
  if (!registry) throw new AppError("NOT_FOUND", "No encontramos esa lista.", 404);
  return registry;
}

export async function getRegistryForManage(userId: string, registryId: string): Promise<GiftRegistryManageDTO> {
  const registry = await requireOwnedRegistry(userId, registryId);
  const items = await prisma.giftRegistryItem.findMany({
    where: { registryId },
    include: ITEM_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  const itemDTOs = items.map(toOwnerItemDTO);
  return {
    id: registry.id,
    slug: registry.slug,
    title: registry.title,
    eventType: registry.eventType,
    eventDate: registry.eventDate?.toISOString() ?? null,
    message: registry.message,
    isActive: registry.isActive,
    itemCount: itemDTOs.length,
    reservedCount: itemDTOs.filter((item) => item.isReserved).length,
    createdAt: registry.createdAt.toISOString(),
    items: itemDTOs,
  };
}

export async function updateRegistry(
  userId: string,
  registryId: string,
  input: GiftRegistryInput,
): Promise<GiftRegistryManageDTO> {
  await requireOwnedRegistry(userId, registryId);
  await prisma.giftRegistry.update({ where: { id: registryId }, data: toDataFields(input) });
  return getRegistryForManage(userId, registryId);
}

export async function deleteRegistry(userId: string, registryId: string): Promise<void> {
  await requireOwnedRegistry(userId, registryId);
  await prisma.giftRegistry.delete({ where: { id: registryId } });
}

export async function addRegistryItem(
  userId: string,
  registryId: string,
  input: AddGiftRegistryItemInput,
): Promise<GiftRegistryManageDTO> {
  await requireOwnedRegistry(userId, registryId);

  const product = await prisma.product.findFirst({
    where: { id: input.productId, status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new AppError("PRODUCT_UNAVAILABLE", "Ese producto ya no está disponible.", 404);

  const existing = await prisma.giftRegistryItem.findUnique({
    where: { registryId_productId: { registryId, productId: input.productId } },
  });
  if (existing) throw new AppError("ALREADY_ADDED", "Ese producto ya está en la lista.", 409);

  await prisma.giftRegistryItem.create({
    data: { registryId, productId: input.productId, note: input.note || null },
  });
  return getRegistryForManage(userId, registryId);
}

export async function removeRegistryItem(userId: string, registryId: string, itemId: string): Promise<void> {
  await requireOwnedRegistry(userId, registryId);
  const item = await prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId } });
  if (!item) throw new AppError("NOT_FOUND", "No encontramos ese ítem en la lista.", 404);
  await prisma.giftRegistryItem.delete({ where: { id: itemId } });
}

/** Vista pública (`/listas/[slug]`) — nunca revela quién reservó cada
 * regalo, solo si ya está reservado o no (ver README, "Diseño: listas de
 * regalos"). Una lista inactiva o inexistente devuelve `null` por igual,
 * para no distinguir "no existe" de "el dueño la ocultó". */
export async function getPublicRegistry(slug: string): Promise<GiftRegistryPublicDTO | null> {
  const registry = await prisma.giftRegistry.findUnique({
    where: { slug },
    include: {
      user: { select: { name: true } },
      items: { include: ITEM_INCLUDE, orderBy: { createdAt: "asc" } },
    },
  });
  if (!registry || !registry.isActive) return null;

  return {
    title: registry.title,
    eventType: registry.eventType,
    eventDate: registry.eventDate?.toISOString() ?? null,
    message: registry.message,
    ownerName: registry.user.name,
    items: registry.items.map((item) => {
      const owner = toOwnerItemDTO(item);
      return {
        id: owner.id,
        productId: owner.productId,
        productName: owner.productName,
        productSlug: owner.productSlug,
        productImageUrl: owner.productImageUrl,
        price: owner.price,
        note: owner.note,
        isReserved: owner.isReserved,
      };
    }),
  };
}

/**
 * "Reservar" es una declaración social ("yo llevo este regalo"), no un
 * pago ni algo que MIMO garantice — la compra real se sigue haciendo por
 * el catálogo normal. Falla si alguien más ya lo reservó (nadie puede
 * "robarle" la reserva a otro visitante).
 */
export async function reserveGiftItem(itemId: string, reservedByName: string): Promise<void> {
  const item = await prisma.giftRegistryItem.findUnique({
    where: { id: itemId },
    include: { registry: { select: { isActive: true } } },
  });
  if (!item || !item.registry.isActive) throw new AppError("NOT_FOUND", "No encontramos ese regalo.", 404);
  if (item.reservedAt) throw new AppError("ALREADY_RESERVED", "Alguien más ya reservó este regalo.", 409);

  await prisma.giftRegistryItem.update({
    where: { id: itemId },
    data: { reservedByName, reservedAt: new Date() },
  });
}
