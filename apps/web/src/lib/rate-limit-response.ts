import { apiError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Punto de entrada para las rutas — separado de `rate-limit.ts` a propósito:
 * ese archivo es lógica pura sin dependencias (fácil de testear), mientras
 * que `apiError` arrastra `@mimo/auth` → `next-auth`, que no resuelve bien
 * fuera de un runtime de Next.js real (rompía los tests de Vitest).
 *
 * `action` identifica el endpoint (ej. "register") para que su límite no
 * comparta balde con otro. Devuelve una respuesta 429 lista para `return`,
 * o `null` si puede seguir.
 */
export function rateLimitResponse(
  request: Request,
  action: string,
  limit: number,
  windowMs: number,
  // Para rutas autenticadas es mejor limitar por usuario que por IP (una
  // oficina/NAT compartida no debería frenar a todos por igual).
  identity?: string,
) {
  const key = `${action}:${identity ?? getClientIp(request)}`;
  const { limited, retryAfterSeconds } = checkRateLimit(key, limit, windowMs);
  if (!limited) return null;

  const response = apiError(
    "RATE_LIMITED",
    "Demasiados intentos. Esperá un momento antes de volver a intentarlo.",
    429,
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}
