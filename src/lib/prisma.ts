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

const TRANSIENT_DB = /EMAXCONNSESSION|max clients reached|P2024|P1001|timed out fetching a new connection|can't reach database server/i;

export function isTransientDbError(err: unknown) {
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  return TRANSIENT_DB.test(`${code} ${message}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Le pooler Supabase refuse parfois une connexion. On relance avant d’afficher une erreur. */
export async function withDbRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (err) {
      last = err;
      if (attempt === attempts - 1 || !isTransientDbError(err)) throw err;
      await sleep(250 * (attempt + 1));
    }
  }
  throw last;
}

function clientWithRetry(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return withDbRetry(() => query(args));
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma =
  globalForPrisma.prisma ??
  clientWithRetry(
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    }),
  );

globalForPrisma.prisma = prisma;
