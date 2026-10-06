import { Prisma, prisma } from "@mimo/database";
import type { AdminUserDTO, AdminUserUpdateInput, UserRole } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { logAdminAction } from "./admin-audit-service";

export interface AdminUserFilters {
  q?: string;
  role?: UserRole;
  isSuspended?: boolean;
}

const ADMIN_USER_INCLUDE = {
  _count: { select: { businessMemberships: true, orders: true } },
} satisfies Prisma.UserInclude;

type AdminUserRow = Prisma.UserGetPayload<{ include: typeof ADMIN_USER_INCLUDE }>;

function toAdminUserDTO(user: AdminUserRow): AdminUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isSuspended: user.deletedAt !== null,
    canReviewDocuments: user.canReviewDocuments,
    businessCount: user._count.businessMemberships,
    orderCount: user._count.orders,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function listAdminUsers(filters: AdminUserFilters = {}): Promise<AdminUserDTO[]> {
  const where: Prisma.UserWhereInput = {
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.isSuspended !== undefined
      ? { deletedAt: filters.isSuspended ? { not: null } : null }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    include: ADMIN_USER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return users.map(toAdminUserDTO);
}

/**
 * Otorgar o quitar el permiso de ver documentos de identidad: solo lo puede
 * hacer un admin que ya lo tiene, solo aplica a admins, y no puede dejar al
 * sistema sin ningún administrador autorizado.
 */
async function assertCanChangeDocumentReviewer(
  target: { id: string; role: UserRole },
  actorId: string,
  grant: boolean,
): Promise<void> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { canReviewDocuments: true } });
  if (!actor?.canReviewDocuments) {
    throw new AppError(
      "DOCUMENT_REVIEW_FORBIDDEN",
      "Solo un administrador autorizado puede otorgar o quitar este permiso.",
      403,
    );
  }
  if (grant && target.role !== "ADMIN") {
    throw new AppError("INVALID_TARGET", "Solo un administrador puede recibir este permiso.", 400);
  }
  if (!grant) {
    const others = await prisma.user.count({
      where: { canReviewDocuments: true, deletedAt: null, id: { not: target.id } },
    });
    if (others === 0) {
      throw new AppError(
        "LAST_REVIEWER",
        "Tiene que quedar al menos un administrador autorizado para revisar documentos.",
        400,
      );
    }
  }
}

/**
 * "Suspender" pone `deletedAt` — el mismo campo que ya revisa `authorize()`
 * en packages/auth/src/config.ts, así que suspender de verdad bloquea el
 * login, no es un estado cosmético.
 */
export async function updateAdminUser(
  userId: string,
  adminUserId: string,
  input: AdminUserUpdateInput,
): Promise<AdminUserDTO> {
  if (userId === adminUserId && (input.isSuspended || input.role)) {
    throw new AppError("SELF_MODIFICATION", "No podés suspenderte ni cambiar tu propio rol.", 400);
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese usuario.", 404);

  if (input.canReviewDocuments !== undefined) {
    await assertCanChangeDocumentReviewer(existing, adminUserId, input.canReviewDocuments);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.role ? { role: input.role } : {}),
      // Dejar de ser admin también quita el acceso a los documentos de identidad.
      ...(input.role && input.role !== "ADMIN" ? { canReviewDocuments: false } : {}),
      ...(input.canReviewDocuments !== undefined ? { canReviewDocuments: input.canReviewDocuments } : {}),
      ...(input.isSuspended !== undefined ? { deletedAt: input.isSuspended ? new Date() : null } : {}),
    },
    include: ADMIN_USER_INCLUDE,
  });

  await logAdminAction({
    adminId: adminUserId,
    action: "user.update",
    targetType: "USER",
    targetId: userId,
    metadata: { role: input.role, isSuspended: input.isSuspended, canReviewDocuments: input.canReviewDocuments },
  });

  return toAdminUserDTO(user);
}
