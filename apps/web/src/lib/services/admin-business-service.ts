import { Prisma, prisma } from "@mimo/database";
import type { AdminBusinessDTO, AdminBusinessUpdateInput, BusinessStatus } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { createNotification } from "./notification-service";

export interface AdminBusinessFilters {
  q?: string;
  status?: BusinessStatus;
}

const ADMIN_BUSINESS_INCLUDE = {
  municipality: true,
  members: { where: { role: "OWNER" as const }, include: { user: true }, take: 1 },
  _count: { select: { products: { where: { deletedAt: null } } } },
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
): Promise<AdminBusinessDTO> {
  const existing = await prisma.business.findFirst({ where: { id: businessId, deletedAt: null } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese negocio.", 404);

  // Al reactivar un negocio suspendido no le tocamos la comisión que ya
  // tenía asignada — solo se calcula la de la prueba gratis la primera vez
  // que un negocio nuevo (o rechazado) pasa a APPROVED.
  const isFirstApproval =
    input.status === "APPROVED" && existing.status !== "APPROVED" && existing.status !== "SUSPENDED";

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

  return toAdminBusinessDTO(business);
}
