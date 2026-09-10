import * as Sentry from "@sentry/nextjs";

/**
 * Hook nativo de Next.js (no algo específico de Sentry) — corre una sola
 * vez al arrancar el server, tanto en el runtime de Node como en el de
 * Edge (`proxy.ts`). Sin SENTRY_DSN configurada (necesita una cuenta
 * gratis en sentry.io) esto no hace nada — no hay monitoreo real sin una
 * cuenta de verdad detrás, y no tiene sentido fingir que sí.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // 10% de las requests — suficiente para ver tendencias de performance
    // sin gastar la cuota gratis de Sentry en un proyecto chico.
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
