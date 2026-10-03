import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Une connexion Prisma par instance. Le plafond réel est le pooler, pas ce chiffre. */
export const PRISMA_DEFAULT_CONNECTION_LIMIT = 1;
export const PRISMA_DEFAULT_POOL_TIMEOUT = 20;

/**
 * Le pooler session Supabase (port 5432) ne garde que 15 clients.
 * Chaque instance Vercel en occupe un, et le 2ᵉ ajout au panier tombe
 * avec EMAXCONNSESSION. Le port 6543 rend la connexion après chaque requête.
 * Les transactions Prisma restent valides : PgBouncer les tient jusqu’au COMMIT.
 * L’hôte direct et Postgres local ne sont pas modifiés.
 */
export function supabaseTransactionPoolerUrl(databaseUrl: string) {
  const at = databaseUrl.lastIndexOf("@");
  if (at < 0) return databaseUrl;
  const rest = databaseUrl.slice(at + 1);
  if (!/pooler\.supabase\.(?:com|co)\b/.test(rest)) return databaseUrl;
  let host = rest.replace(/(pooler\.supabase\.(?:com|co)):5432\b/, "$1:6543");
  if (!/:6543\b/.test(host) && !/pooler\.supabase\.(?:com|co):\d+\b/.test(host)) {
    host = host.replace(/(pooler\.supabase\.(?:com|co))\b/, "$1:6543");
  }
  let url = databaseUrl.slice(0, at + 1) + host;
  if (/:6543\b/.test(host) && !/[?&]pgbouncer=/.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  return url;
}

export function prismaDatasourceUrl(databaseUrl?: string | null) {
  if (!databaseUrl) return undefined;
  let url = supabaseTransactionPoolerUrl(databaseUrl);
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
