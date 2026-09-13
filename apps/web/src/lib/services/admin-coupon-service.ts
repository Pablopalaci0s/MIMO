import { Prisma, prisma } from "@mimo/database";
import type { AdminCouponDTO, AdminCouponInput } from "@mimo/types";
import { AppError } from "@/lib/errors";

function toAdminCouponDTO(coupon: Prisma.CouponGetPayload<Record<string, never>>): AdminCouponDTO {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    minSubtotal: coupon.minSubtotal === null ? null : Number(coupon.minSubtotal),
    maxUses: coupon.maxUses,
    maxUsesPerUser: coupon.maxUsesPerUser,
    usedCount: coupon.usedCount,
    startsAt: coupon.startsAt?.toISOString() ?? null,
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt.toISOString(),
  };
}

export async function listAdminCoupons(): Promise<AdminCouponDTO[]> {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return coupons.map(toAdminCouponDTO);
}

function toData(input: AdminCouponInput) {
  return {
    code: input.code.trim().toUpperCase(),
    description: input.description || null,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minSubtotal: input.minSubtotal ?? null,
    maxUses: input.maxUses ?? null,
    maxUsesPerUser: input.maxUsesPerUser ?? null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    isActive: input.isActive,
  };
}

export async function createAdminCoupon(input: AdminCouponInput): Promise<AdminCouponDTO> {
  try {
    const coupon = await prisma.coupon.create({ data: toData(input) });
    return toAdminCouponDTO(coupon);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("COUPON_CODE_TAKEN", "Ya existe un cupón con ese código.", 409);
    }
    throw error;
  }
}

export async function updateAdminCoupon(id: string, input: AdminCouponInput): Promise<AdminCouponDTO> {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese cupón.", 404);

  try {
    const coupon = await prisma.coupon.update({ where: { id }, data: toData(input) });
    return toAdminCouponDTO(coupon);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("COUPON_CODE_TAKEN", "Ya existe un cupón con ese código.", 409);
    }
    throw error;
  }
}

export async function deleteAdminCoupon(id: string): Promise<void> {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese cupón.", 404);
  await prisma.coupon.delete({ where: { id } });
}
