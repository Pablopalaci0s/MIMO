import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * El botón de PayPal necesita el Client ID en el navegador, pero
 * `NEXT_PUBLIC_*` no se inyecta al bundle del cliente porque el `.env`
 * vive en la raíz del monorepo, no en `apps/web/` (ver CLAUDE.md, "Gotchas
 * reales encontrados") — mismo workaround que `/api/push/vapid-public-key`.
 */
export async function GET() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return apiError("PAYMENT_PROVIDER_NOT_CONFIGURED", "PayPal no está configurado.", 503);
  }
  return apiSuccess({ clientId });
}
