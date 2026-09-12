import { prisma } from "@mimo/database";
import type { CouponPreviewDTO } from "@mimo/types";
import { AppError } from "@/lib/errors";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Subconjunto de `PrismaClient`/`Prisma.TransactionClient` que necesita
 * esta validación — así funciona igual llamada suelta (vista previa del
 * checkout) o adentro de la transacción de `createOrder` (donde tiene que
 * correr, para que el incremento de `usedCount` sea atómico con la
 * creación real del pedido). */
type CouponDb = Pick<typeof prisma, "coupon" | "order">;

export interface CouponValidationResult {
  couponId: string;
  code: string;
  description: string | null;
  discountAmount: number;
}

/**
 * Valida un código contra el subtotal actual y calcula cuánto descuenta.
 * Nunca incrementa el uso acá — eso solo pasa cuando el pedido se crea de
 * verdad (`order-service.ts`), para no "gastar" un cupón en una vista
 * previa que el comprador nunca termina de pagar.
 */
export async function validateCoupon(
  db: CouponDb,
  userId: string,
  rawCode: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw new AppError("COUPON_NOT_FOUND", "Ese código no existe o ya no está activo.", 404);
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new AppError("COUPON_NOT_STARTED", "Ese código todavía no está disponible.", 400);
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new AppError("COUPON_EXPIRED", "Ese código ya venció.", 400);
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError("COUPON_MAX_USES", "Ese código ya alcanzó su límite de usos.", 400);
  }
  if (coupon.minSubtotal !== null && subtotal < Number(coupon.minSubtotal)) {
    throw new AppError(
      "COUPON_MIN_SUBTOTAL",
      `Este código necesita un mínimo de $${Number(coupon.minSubtotal).toFixed(2)} en productos.`,
      400,
    );
  }
  if (coupon.maxUsesPerUser !== null) {
    const usedByUser = await db.order.count({
      where: { buyerId: userId, couponCode: code, status: { not: "CANCELLED" } },
    });
    if (usedByUser >= coupon.maxUsesPerUser) {
      throw new AppError("COUPON_ALREADY_USED", "Ya usaste este código antes.", 400);
    }
  }

  const rawDiscount =
    coupon.discountType === "PERCENTAGE"
      ? subtotal * (Number(coupon.discountValue) / 100)
      : Number(coupon.discountValue);
  const discountAmount = round2(Math.min(rawDiscount, subtotal));

  return { couponId: coupon.id, code: coupon.code, description: coupon.description, discountAmount };
}

export async function previewCoupon(userId: string, code: string, subtotal: number): Promise<CouponPreviewDTO> {
  const result = await validateCoupon(prisma, userId, code, subtotal);
  return { code: result.code, description: result.description, discountAmount: result.discountAmount };
}
