import { Prisma, prisma } from "@mimo/database";
import type {
  BusinessDeliveryZoneDTO,
  BusinessDeliveryZoneInput,
  BusinessHoursDTO,
  WeeklyHours,
} from "@mimo/types";
import { WEEK_DAYS } from "@mimo/types";
import { AppError } from "@/lib/errors";

const EMPTY_WEEK: WeeklyHours = Object.fromEntries(WEEK_DAYS.map((day) => [day, null])) as WeeklyHours;

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
