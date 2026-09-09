import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __mimoPrisma: PrismaClient | undefined;
}

/**
 * Single shared Prisma instance. Reused across hot reloads in dev so we
 * don't exhaust Postgres connections; every service in packages/* and every
 * route handler in apps/web imports this instead of creating its own client.
 */
export const prisma =
  global.__mimoPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__mimoPrisma = prisma;
}

export * from "@prisma/client";
