import { NextRequest } from "next/server";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { expireUnconfirmedPaypalOrders } from "@/lib/services/order-expiry-service";

/**
 * Cancela y reembolsa la parte de un pedido pagado con PayPal que ningún
 * negocio confirmó a tiempo (ver README "Diseño: pagos con PayPal" y
 * `order-expiry-service.ts`). Pensado para correr cada 10-15 min desde
 * `.github/workflows/cron-expirar-pedidos.yml` — mismo esquema de
 * protección que `/api/cron/fechas-importantes`.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return apiError("CRON_NOT_CONFIGURED", "CRON_SECRET no está configurado.", 503);
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return apiError("UNAUTHORIZED", "No autorizado", 401);
    }

    const result = await expireUnconfirmedPaypalOrders();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
