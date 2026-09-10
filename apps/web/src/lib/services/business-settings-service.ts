import { Prisma, prisma } from "@mimo/database";
import type {
  BusinessDeliveryZoneDTO,
  BusinessDeliveryZoneInput,
  BusinessHoursDTO,
  BusinessProfileDTO,
  BusinessProfileInput,
  WeeklyHours,
} from "@mimo/types";
import { WEEK_DAYS } from "@mimo/types";
import { AppError } from "@/lib/errors";

const EMPTY_WEEK: WeeklyHours = Object.fromEntries(WEEK_DAYS.map((day) => [day, null])) as WeeklyHours;

export async function getBusinessProfile(businessId: string): Promise<BusinessProfileDTO> {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: {
      name: true,
      description: true,
      logoUrl: true,
      coverUrl: true,
      phone: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      addressLine: true,
    },
  });
  return business;
}

export async function updateBusinessProfile(
  businessId: string,
  input: BusinessProfileInput,
): Promise<BusinessProfileDTO> {
  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp || null } : {}),
      ...(input.instagram !== undefined ? { instagram: input.instagram || null } : {}),
      ...(input.facebook !== undefined ? { facebook: input.facebook || null } : {}),
      ...(input.tiktok !== undefined ? { tiktok: input.tiktok || null } : {}),
      ...(input.addressLine !== undefined ? { addressLine: input.addressLine || null } : {}),
    },
    select: {
      name: true,
      description: true,
      logoUrl: true,
      coverUrl: true,
      phone: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      addressLine: true,
    },
  });
  return business;
}

export async function getBusinessHours(businessId: string): Promise<BusinessHoursDTO> {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { openingHours: true, preparationTimeMinutes: true },
  });
  const stored = (business.openingHours as WeeklyHours | null) ?? {};
  return {
    openingHours: { ...EMPTY_WEEK, ...stored },
    preparationTimeMinutes: business.preparationTimeMinutes,
  };
}

export async function updateBusinessHours(
  businessId: string,
  input: BusinessHoursDTO,
): Promise<BusinessHoursDTO> {
  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      openingHours: input.openingHours as Prisma.InputJsonValue,
      preparationTimeMinutes: input.preparationTimeMinutes,
    },
    select: { openingHours: true, preparationTimeMinutes: true },
  });
  return {
    openingHours: { ...EMPTY_WEEK, ...(business.openingHours as WeeklyHours | null) },
    preparationTimeMinutes: business.preparationTimeMinutes,
  };
}

function toZoneDTO(
  zone: Prisma.DeliveryZoneGetPayload<{ include: { municipality: true } }>,
): BusinessDeliveryZoneDTO {
  return {
    id: zone.id,
    name: zone.name,
    municipalityId: zone.municipalityId,
    municipalityName: zone.municipality?.name ?? null,
    deliveryFee: Number(zone.deliveryFee),
    estimatedMinutes: zone.estimatedMinutes,
    isActive: zone.isActive,
  };
}

export async function listBusinessDeliveryZones(businessId: string): Promise<BusinessDeliveryZoneDTO[]> {
  const zones = await prisma.deliveryZone.findMany({
    where: { businessId },
    include: { municipality: true },
    orderBy: { createdAt: "asc" },
  });
  return zones.map(toZoneDTO);
}

export async function createBusinessDeliveryZone(
  businessId: string,
  input: BusinessDeliveryZoneInput,
): Promise<BusinessDeliveryZoneDTO> {
  const zone = await prisma.deliveryZone.create({
    data: {
      businessId,
      name: input.name,
      municipalityId: input.municipalityId ?? null,
      deliveryFee: input.deliveryFee,
      estimatedMinutes: input.estimatedMinutes,
      isActive: input.isActive,
    },
    include: { municipality: true },
  });
  return toZoneDTO(zone);
}

export async function updateBusinessDeliveryZone(
  businessId: string,
  zoneId: string,
  input: BusinessDeliveryZoneInput,
): Promise<BusinessDeliveryZoneDTO> {
  const existing = await prisma.deliveryZone.findFirst({ where: { id: zoneId, businessId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa zona de entrega.", 404);

  const zone = await prisma.deliveryZone.update({
    where: { id: zoneId },
    data: {
      name: input.name,
      municipalityId: input.municipalityId ?? null,
      deliveryFee: input.deliveryFee,
      estimatedMinutes: input.estimatedMinutes,
      isActive: input.isActive,
    },
    include: { municipality: true },
  });
  return toZoneDTO(zone);
}

export async function deleteBusinessDeliveryZone(businessId: string, zoneId: string): Promise<void> {
  const existing = await prisma.deliveryZone.findFirst({ where: { id: zoneId, businessId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa zona de entrega.", 404);

  await prisma.deliveryZone.delete({ where: { id: zoneId } });
}
