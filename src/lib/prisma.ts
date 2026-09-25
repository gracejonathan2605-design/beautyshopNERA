import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Session pooler Supabase = 15 clients. Une connexion par instance, sinon l’admin sature le pool. */
export const PRISMA_DEFAULT_CONNECTION_LIMIT = 1;
export const PRISMA_DEFAULT_POOL_TIMEOUT = 20;

export function prismaDatasourceUrl(databaseUrl?: string | null) {
  if (!databaseUrl) return undefined;
  let url = databaseUrl;
  if (!url.includes("connection_limit=")) {
    url += `${url.includes("?") ? "&" : "?"}connection_limit=${PRISMA_DEFAULT_CONNECTION_LIMIT}`;
  }
  if (!url.includes("pool_timeout=")) {
    url += `${url.includes("?") ? "&" : "?"}pool_timeout=${PRISMA_DEFAULT_POOL_TIMEOUT}`;
  }
  return url;
}

const datasourceUrl = prismaDatasourceUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });

globalForPrisma.prisma = prisma;
