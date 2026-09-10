import * as Sentry from "@sentry/nextjs";

// Contraparte de instrumentation.ts para el navegador — necesita su propia
// variable NEXT_PUBLIC_* porque el código del cliente no puede leer
// variables de entorno sin ese prefijo (Next.js las expone al bundle).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Requerido por el SDK para instrumentar navegaciones (cambios de ruta) en
// el App Router — no hace nada si Sentry no se inicializó arriba.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
