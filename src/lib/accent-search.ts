import { prisma } from "@/lib/prisma";

/** Motif LIKE sûr : échappe \, % et _ puis entoure de %. */
export function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

let unaccentProbe: Promise<boolean> | null = null;

/** Vrai si l'extension Postgres unaccent est installée (sondé une fois par instance). */
export function unaccentAvailable() {
  unaccentProbe ??= prisma
    .$queryRaw<{ ok: number }[]>`SELECT 1 AS ok FROM pg_extension WHERE extname = 'unaccent'`
    .then((rows) => rows.length > 0)
    .catch(() => {
      unaccentProbe = null;
      return false;
    });
  return unaccentProbe;
}

async function idsOrNull(run: () => Promise<{ id: string }[]>) {
  // Extension unaccent absente : l'appelant garde la recherche ILIKE classique.
  if (!(await unaccentAvailable())) return null;
  try {
    const rows = await run();
    return rows.map((row) => row.id);
  } catch {
    return null;
  }
}

/** Variantes dont le nom ou le produit correspond sans tenir compte des accents (caisse). */
export function variantIdsMatching(q: string, limit = 60) {
  const pattern = likePattern(q.toLowerCase());
  return idsOrNull(
    () => prisma.$queryRaw<{ id: string }[]>`
      SELECT v.id
      FROM "ProductVariant" v
      JOIN "Product" p ON p.id = v."productId"
      WHERE v."deletedAt" IS NULL
        AND (
          unaccent(lower(v.name)) LIKE unaccent(${pattern}) ESCAPE '\\'
          OR unaccent(lower(p.name)) LIKE unaccent(${pattern}) ESCAPE '\\'
        )
      LIMIT ${limit}`,
  );
}

/** Produits dont le nom, la courte description ou le rayon correspond sans tenir compte des accents. */
export function productIdsMatching(q: string, limit = 200) {
  const pattern = likePattern(q.toLowerCase());
  return idsOrNull(
    () => prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Product" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE p."deletedAt" IS NULL
        AND (
          unaccent(lower(p.name)) LIKE unaccent(${pattern}) ESCAPE '\\'
          OR unaccent(lower(coalesce(p."shortDescription", ''))) LIKE unaccent(${pattern}) ESCAPE '\\'
          OR unaccent(lower(coalesce(c.name, ''))) LIKE unaccent(${pattern}) ESCAPE '\\'
        )
      LIMIT ${limit}`,
  );
}
