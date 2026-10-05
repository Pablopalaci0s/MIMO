import { Prisma, prisma } from "@mimo/database";
import type { AdminBusinessDTO, AdminBusinessUpdateInput, BusinessStatus } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { BUSINESS_AGREEMENT_VERSION } from "@/lib/legal/business-agreement";
import { logAdminAction } from "./admin-audit-service";
import { assertCanBeApproved } from "./business-agreement-service";
import { createNotification } from "./notification-service";

export interface AdminBusinessFilters {
  q?: string;
  status?: BusinessStatus;
}

const ADMIN_BUSINESS_INCLUDE = {
  municipality: true,
  members: { where: { role: "OWNER" as const }, include: { user: true }, take: 1 },
  _count: { select: { products: { where: { deletedAt: null } } } },
  agreements: { where: { version: BUSINESS_AGREEMENT_VERSION }, select: { id: true }, take: 1 },
} satisfies Prisma.BusinessInclude;

type AdminBusinessRow = Prisma.BusinessGetPayload<{ include: typeof ADMIN_BUSINESS_INCLUDE }>;

function toAdminBusinessDTO(business: AdminBusinessRow): AdminBusinessDTO {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    status: business.status,
    verified: business.verified,
    isDemo: business.isDemo,
    municipalityName: business.municipality?.name ?? null,
    ownerEmail: business.members[0]?.user.email ?? null,
    ratingAvg: business.ratingAvg,
    ratingCount: business.ratingCount,
    productCount: business._count.products,
    commissionRate: Number(business.commissionRate),
    agreementAccepted: business.agreements.length > 0,
    createdAt: business.createdAt.toISOString(),
  };
}

/** Cuántos negocios reales (no demo) ya pasaron por la fase de prueba sin
 * comisión — determina si el próximo negocio aprobado entra gratis o ya
 * con el 10% (ver README, "Diseño: pagos con PayPal"). */
const FREE_TRIAL_BUSINESS_COUNT = 10;

async function nextApprovalCommissionRate(): Promise<number> {
  const approvedRealBusinesses = await prisma.business.count({
    where: { isDemo: false, status: "APPROVED", deletedAt: null },
  });
  return approvedRealBusinesses < FREE_TRIAL_BUSINESS_COUNT ? 0 : 10;
}

export async function listAdminBusinesses(filters: AdminBusinessFilters = {}): Promise<AdminBusinessDTO[]> {
  const where: Prisma.BusinessWhereInput = {
    deletedAt: null,
    ...(filters.q ? { name: { contains: filters.q, mode: "insensitive" } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const businesses = await prisma.business.findMany({
    where,
    include: ADMIN_BUSINESS_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return businesses.map(toAdminBusinessDTO);
}

export async function updateAdminBusiness(
  businessId: string,
  input: AdminBusinessUpdateInput,
  adminId: string,
): Promise<AdminBusinessDTO> {
  const existing = await prisma.business.findFirst({ where: { id: businessId, deletedAt: null } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese negocio.", 404);

  // Al reactivar un negocio suspendido no le tocamos la comisión que ya
  // tenía asignada — solo se calcula la de la prueba gratis la primera vez
  // que un negocio nuevo (o rechazado) pasa a APPROVED.
  const isFirstApproval =
    input.status === "APPROVED" && existing.status !== "APPROVED" && existing.status !== "SUSPENDED";

  // Requisito antes de abrirle MIMO a un negocio real: haber aceptado el
  // Acuerdo MIMO ↔ negocio vigente (ver `business-agreement-service.ts`).
  if (input.status === "APPROVED" && existing.status !== "APPROVED") {
    await assertCanBeApproved(existing);
  }

  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.verified !== undefined ? { verified: input.verified } : {}),
      ...(input.commissionRate !== undefined ? { commissionRate: input.commissionRate } : {}),
      ...(isFirstApproval ? { commissionRate: await nextApprovalCommissionRate() } : {}),
    },
    include: ADMIN_BUSINESS_INCLUDE,
  });

  const ownerId = business.members[0]?.user.id;
  if (ownerId && input.status && input.status !== existing.status) {
    if (input.status === "APPROVED") {
      await createNotification({
        userId: ownerId,
        type: "BUSINESS_APPROVED",
        title: "Tu negocio fue aprobado",
        body: `${business.name} ya está visible en MIMO.`,
        linkHref: "/negocio",
      });
    } else if (input.status === "SUSPENDED") {
      await createNotification({
        userId: ownerId,
        type: "BUSINESS_SUSPENDED",
        title: "Tu negocio fue suspendido",
        body: `${business.name} ya no aparece en el catálogo. Contactá a soporte si creés que es un error.`,
        linkHref: "/negocio",
      });
    }
  }

  await logAdminAction({
    adminId,
    action: "business.update",
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: { status: input.status, verified: input.verified, commissionRate: input.commissionRate },
  });

  return toAdminBusinessDTO(business);
}
