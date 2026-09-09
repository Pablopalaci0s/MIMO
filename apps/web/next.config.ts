import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Monorepo root .env, shared with packages/database's Prisma CLI so
// DATABASE_URL (and every other secret) is defined in exactly one place.
loadEnvConfig(path.join(__dirname, "../.."));

const nextConfig: NextConfig = {
  transpilePackages: ["@mimo/ai", "@mimo/auth", "@mimo/database", "@mimo/types", "@mimo/validation"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
