import { apiSuccess } from "@/lib/api-response";

/**
 * El cliente necesita la clave pública VAPID para suscribirse, pero no
 * podemos confiar en que Next/Turbopack la inyecte como `NEXT_PUBLIC_*` en
 * el bundle: ese inlining solo escanea `.env` dentro de `apps/web/`, y este
 * proyecto carga un único `.env` en la raíz del monorepo (compartido con
 * Prisma) vía `loadEnvConfig` en `next.config.ts` — confirmado vacío en el
 * bundle real. Se sirve por API en su lugar: es una clave pública por
 * diseño (no un secreto), así que no hay ningún problema en exponerla acá.
 */
export async function GET() {
  return apiSuccess({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null });
}
