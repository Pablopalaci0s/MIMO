import { Prisma, prisma } from "@mimo/database";
import type { CoverageRequestDTO, CoverageRequestInput, DeliveryCoverageResult } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { resolveDeliveryCoverage } from "./delivery-coverage-logic";

/**
 * Cobertura real por negocio, no un fee por defecto — si un negocio no
 * configuró una `DeliveryZone` activa para ese municipio, no puede
 * entregar ahí (queda a criterio de cada negocio, nunca se asume). Este es
 * el único lugar que decide "cubierto sí/no"; tanto el checkout como
 * `order-service.createOrder` lo usan (mismo `resolveDeliveryCoverage` de
 * `delivery-coverage-logic.ts`, para que nunca se desincronicen entre sí).
 */
export async function checkDeliveryCoverage(
  businessIds: string[],
  municipalityId: string,
): Promise<DeliveryCoverageResult[]> {
  const [businesses, zones] = await Promise.all([
    prisma.business.findMany({ where: { id: { in: businessIds } }, select: { id: true, name: true } }),
    prisma.deliveryZone.findMany({
      where: {
        businessId: { in: businessIds },
        isActive: true,
        OR: [{ municipalityId }, { municipalityId: null }],
      },
    }),
  ]);

  const { feeByBusiness } = resolveDeliveryCoverage(
    businessIds,
    zones.map((zone) => ({
      businessId: zone.businessId,
      municipalityId: zone.municipalityId,
      deliveryFee: Number(zone.deliveryFee),
      estimatedMinutes: zone.estimatedMinutes,
    })),
  );

  return businesses.map((business) => {
    const zone = feeByBusiness.get(business.id);
    return {
      businessId: business.id,
      businessName: business.name,
      covered: Boolean(zone),
      deliveryFee: zone?.deliveryFee ?? null,
      estimatedMinutes: zone?.estimatedMinutes ?? null,
    };
  });
}

const COVERAGE_REQUEST_INCLUDE = {
  business: true,
  municipality: true,
  user: true,
} satisfies Prisma.CoverageRequestInclude;

type CoverageRequestRow = Prisma.CoverageRequestGetPayload<{ include: typeof COVERAGE_REQUEST_INCLUDE }>;

function toCoverageRequestDTO(request: CoverageRequestRow): CoverageRequestDTO {
  return {
    id: request.id,
    businessName: request.business.name,
    municipalityName: request.municipality.name,
    contactName: request.contactName,
    contactPhone: request.contactPhone,
    contactEmail: request.contactEmail,
    requesterName: request.user?.name ?? null,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  };
}

export async function createCoverageRequest(
  userId: string | undefined,
  input: CoverageRequestInput,
): Promise<{ id: string }> {
  const business = await prisma.business.findUnique({ where: { id: input.businessId }, select: { id: true } });
  if (!business) throw new AppError("NOT_FOUND", "No encontramos ese negocio.", 404);

  const request = await prisma.coverageRequest.create({
    data: {
      businessId: input.businessId,
      municipalityId: input.municipalityId,
      userId,
      contactName: input.contactName || null,
      contactPhone: input.contactPhone || null,
      contactEmail: input.contactEmail || null,
    },
    select: { id: true },
  });
  return request;
}

export async function listAdminCoverageRequests(): Promise<CoverageRequestDTO[]> {
  const requests = await prisma.coverageRequest.findMany({
    include: COVERAGE_REQUEST_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return requests.map(toCoverageRequestDTO);
}

export async function updateCoverageRequestStatus(
  requestId: string,
  status: CoverageRequestDTO["status"],
): Promise<CoverageRequestDTO> {
  const existing = await prisma.coverageRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos esa solicitud.", 404);

  const request = await prisma.coverageRequest.update({
    where: { id: requestId },
    data: { status },
    include: COVERAGE_REQUEST_INCLUDE,
  });
  return toCoverageRequestDTO(request);
}
