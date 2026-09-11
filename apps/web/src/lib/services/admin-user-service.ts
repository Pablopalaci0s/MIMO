import { Prisma, prisma } from "@mimo/database";
import type { AdminUserDTO, AdminUserUpdateInput, UserRole } from "@mimo/types";
import { AppError } from "@/lib/errors";

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

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.isSuspended !== undefined ? { deletedAt: input.isSuspended ? new Date() : null } : {}),
    },
    include: ADMIN_USER_INCLUDE,
  });
  return toAdminUserDTO(user);
}
