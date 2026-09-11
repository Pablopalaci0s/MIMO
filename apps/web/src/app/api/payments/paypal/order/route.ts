import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@mimo/auth";
import { cartItemInputSchema, checkoutAddressSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getCheckoutTotal } from "@/lib/services/order-service";
import { createPaypalCheckoutOrder } from "@/lib/services/paypal-service";

const bodySchema = z.object({
  items: z.array(cartItemInputSchema).min(1),
  address: checkoutAddressSchema,
});

/**
 * Crea la orden en PayPal (sin cobrar todavía) para que el botón de PayPal
 * del checkout la muestre al comprador. El total se recalcula acá desde la
 * base de datos con la misma lógica que `createOrder` — nunca confiamos en
 * un monto que venga del cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = bodySchema.parse(body);

    const { total } = await getCheckoutTotal(input);
    const paypalOrderId = await createPaypalCheckoutOrder(total);

    return apiSuccess({ paypalOrderId, total });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
