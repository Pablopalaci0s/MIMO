import { Prisma, prisma } from "@mimo/database";
import type { AdminBusinessDTO, AdminBusinessUpdateInput } from "@mimo/types";
import { AppError } from "@/lib/errors";

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
    createdAt: business.createdAt.toISOString(),
  };
}

export async function listAdminBusinesses(): Promise<AdminBusinessDTO[]> {
  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
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

  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.verified !== undefined ? { verified: input.verified } : {}),
    },
    include: ADMIN_BUSINESS_INCLUDE,
  });
  return toAdminBusinessDTO(business);
}
