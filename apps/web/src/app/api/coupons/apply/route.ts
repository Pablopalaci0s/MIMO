import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { applyCouponSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { previewCoupon } from "@/lib/services/coupon-service";
import { computeCartSubtotal } from "@/lib/services/order-service";

/**
 * Vista previa de un cupón en el checkout — valida el código y devuelve
 * cuánto descuenta, pero no lo "gasta" (eso solo pasa al crear el pedido
 * de verdad, ver `createOrder`). El subtotal se recalcula acá desde la
 * base de datos, nunca se confía en lo que muestre el carrito del cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = applyCouponSchema.parse(body);

    const subtotal = await computeCartSubtotal(input.items);
    const preview = await previewCoupon(session.user.id, input.code, subtotal);

    return apiSuccess(preview);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
