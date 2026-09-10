/**
 * Rate limiting en memoria — no hay Redis ni otro store compartido en este
 * proyecto, así que esto solo protege bien un despliegue de UNA instancia
 * (que ya es un requisito real por las fotos en disco local, ver README,
 * "Almacenamiento de imágenes"). Con varias instancias cada una tendría su
 * propio contador — documentado acá para no fingir una protección que no
 * escala, no porque sea un problema hoy.
 *
 * Ventana fija simple (no sliding window): suficiente para frenar spam
 * automatizado sin necesitar una librería externa.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Evita que `buckets` crezca sin límite con IPs que solo pegan una vez.
const MAX_TRACKED_KEYS = 5000;

function sweepIfNeeded(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

/** `key` debería incluir tanto el IP como la acción (ej. "register:1.2.3.4")
 * para que límites de distintos endpoints no se pisen entre sí. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepIfNeeded(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const limited = bucket.count > limit;
  return { limited, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

/** Primer IP de `x-forwarded-for` (el estándar que ponen Vercel/Nginx/la
 * mayoría de proxies), con fallback a `x-real-ip`. Si el host no manda
 * ninguno de los dos, todo el tráfico comparte un mismo balde — un límite
 * más flojo, no una falla silenciosa. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
