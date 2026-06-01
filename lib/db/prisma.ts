import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient instance.
 *
 * In dev, Next.js hot-reload re-evaluates modules frequently; without caching
 * on globalThis we'd open a new connection pool on every reload and exhaust
 * Postgres connections. In prod a fresh module graph means one instance.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
