import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Monorepo root .env, shared with packages/database's Prisma CLI so
// DATABASE_URL (and every other secret) is defined in exactly one place.
loadEnvConfig(path.join(__dirname, "../.."));

const nextConfig: NextConfig = {
  transpilePackages: ["@mimo/ai", "@mimo/auth", "@mimo/database", "@mimo/types", "@mimo/validation"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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
