import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Monorepo root .env, shared with packages/database's Prisma CLI so
// DATABASE_URL (and every other secret) is defined in exactly one place.
loadEnvConfig(path.join(__dirname, "../.."));

// CSP solo en producción: Turbopack dev (HMR por WebSocket + eval en el
// bundle de desarrollo) rompe con una política estricta, y no protege nada
// mientras el sitio corre en la máquina de un solo desarrollador.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://*.sentry.io",
  "frame-src https://www.paypal.com https://www.sandbox.paypal.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [
        { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ["@mimo/ai", "@mimo/auth", "@mimo/database", "@mimo/types", "@mimo/validation"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

// Sin SENTRY_AUTH_TOKEN (necesita una cuenta en sentry.io) esto no falla —
// simplemente no sube source maps, así que el build funciona igual sin
// cuenta configurada. `Sentry.init()` (instrumentation.ts /
// instrumentation-client.ts) es lo que activa el reporte de errores en
// tiempo de ejecución, gateado por SENTRY_DSN.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
