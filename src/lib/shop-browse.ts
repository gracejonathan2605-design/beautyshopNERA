import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withFlashProductSelect } from "@/lib/product-query";
import { displayUnitPrice } from "@/lib/stock-display";

export const SHOP_PAGE_SIZE = 24;

export type BrowseSort = "name" | "price-asc" | "price-desc" | "newest";
export type BrowseView = "all" | "new" | "promo";

export type BrowseQuery = {
  q: string;
  rayon: string;
  vue: BrowseView;
  tri: BrowseSort;
  page: number;
};

type SearchLike = {
  q?: string;
  rayon?: string;
  vue?: string;
  tri?: string;
  page?: string;
};

export function parseBrowseQuery(sp: SearchLike): BrowseQuery {
  const vue: BrowseView =
    sp.vue === "nouveautes" || sp.vue === "new" ? "new" : sp.vue === "promos" || sp.vue === "promo" ? "promo" : "all";
  const tri: BrowseSort =
    sp.tri === "prix-asc" || sp.tri === "price-asc"
      ? "price-asc"
      : sp.tri === "prix-desc" || sp.tri === "price-desc"
        ? "price-desc"
        : sp.tri === "recent" || sp.tri === "newest"
          ? "newest"
          : "name";
  const parsedPage = Number.parseInt(sp.page ?? "1", 10);
  return {
    q: (sp.q ?? "").trim(),
    rayon: (sp.rayon ?? "").trim(),
    vue,
    tri,
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  };
}

export function browseSearchParams(query: BrowseQuery, overrides: Partial<BrowseQuery> = {}) {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.rayon) params.set("rayon", next.rayon);
  if (next.vue === "new") params.set("vue", "nouveautes");
  if (next.vue === "promo") params.set("vue", "promos");
  if (next.tri === "price-asc") params.set("tri", "prix-asc");
  if (next.tri === "price-desc") params.set("tri", "prix-desc");
  if (next.tri === "newest") params.set("tri", "recent");
  if (next.page > 1) params.set("page", String(next.page));
  return params;
}

export function browseHref(basePath: string, query: BrowseQuery, overrides: Partial<BrowseQuery> = {}) {
  const qs = browseSearchParams(query, overrides).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function descendantCategoryIds(rootId: string) {
  const children = await prisma.category.findMany({
    where: { parentId: rootId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  const childIds = children.map((child) => child.id);
  const grand = childIds.length
    ? await prisma.category.findMany({
        where: { parentId: { in: childIds }, isActive: true, deletedAt: null },
        select: { id: true },
      })
    : [];
  return [rootId, ...childIds, ...grand.map((row) => row.id)];
}

export async function categoryIdsForSlug(slug: string) {
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!category) return [];
  return descendantCategoryIds(category.id);
}

export function shopProductWhere(filters: {
  q?: string;
  categoryIds?: string[];
  vue?: BrowseView;
}): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [
    { status: "ACTIVE", onlineVisible: true, deletedAt: null },
  ];
  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { shortDescription: { contains: filters.q, mode: "insensitive" } },
        { category: { name: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.categoryIds?.length) {
    and.push({ categoryId: { in: filters.categoryIds } });
  }
  if (filters.vue === "new") and.push({ isNew: true });
  if (filters.vue === "promo") {
    and.push({
      OR: [
        { isPromo: true },
        {
          variants: {
            some: {
              isActive: true,
              deletedAt: null,
              promoPrice: { gt: 0 },
            },
          },
        },
      ],
    });
  }
  return { AND: and };
}

export function sortShopProducts<
  T extends {
    name: string;
    createdAt: Date;
    variants: { salePrice: number; promoPrice: number | null }[];
  },
>(products: T[], tri: BrowseSort) {
  const copy = [...products];
  copy.sort((a, b) => {
    if (tri === "price-asc") return displayUnitPrice(a.variants) - displayUnitPrice(b.variants);
    if (tri === "price-desc") return displayUnitPrice(b.variants) - displayUnitPrice(a.variants);
    if (tri === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
    return a.name.localeCompare(b.name, "fr");
  });
  return copy;
}

export function catalogSkip(page: number, size = SHOP_PAGE_SIZE) {
  return Math.max(0, (Math.max(1, page) - 1) * size);
}

export function catalogPageMeta(total: number, page: number, size = SHOP_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / size) || 1);
  const safePage = Math.min(Math.max(1, page), pages);
  return { total, page: safePage, pages, skip: (safePage - 1) * size, take: size };
}

export function paginateItems<T>(items: T[], page: number, size = SHOP_PAGE_SIZE) {
  const meta = catalogPageMeta(items.length, page, size);
  return {
    items: items.slice(meta.skip, meta.skip + meta.take),
    total: meta.total,
    page: meta.page,
    pages: meta.pages,
  };
}

const EFFECTIVE_PRICE_SQL = Prisma.sql`(
  SELECT MIN(
    CASE
      WHEN v."promoPrice" IS NOT NULL AND v."promoPrice" > 0 AND v."promoPrice" < v."salePrice"
      THEN v."promoPrice"
      ELSE v."salePrice"
    END
  )
  FROM "ProductVariant" v
  WHERE v."productId" = p.id AND v."isActive" = true AND v."deletedAt" IS NULL
)`;

function shopBrowseSqlWhere(filters: { q?: string; categoryIds?: string[]; vue?: BrowseView }) {
  const parts: Prisma.Sql[] = [
    Prisma.sql`p.status = 'ACTIVE' AND p."onlineVisible" = true AND p."deletedAt" IS NULL`,
  ];
  if (filters.q) {
    const like = `%${filters.q}%`;
    parts.push(Prisma.sql`(
      p.name ILIKE ${like}
      OR coalesce(p."shortDescription", '') ILIKE ${like}
      OR EXISTS (SELECT 1 FROM "Category" c WHERE c.id = p."categoryId" AND c.name ILIKE ${like})
    )`);
  }
  if (filters.categoryIds?.length) {
    parts.push(Prisma.sql`p."categoryId" IN (${Prisma.join(filters.categoryIds)})`);
  }
  if (filters.vue === "new") parts.push(Prisma.sql`p."isNew" = true`);
  if (filters.vue === "promo") {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductVariant" v
      WHERE v."productId" = p.id
        AND v."isActive" = true
        AND v."deletedAt" IS NULL
        AND v."promoPrice" IS NOT NULL
        AND v."promoPrice" > 0
        AND v."promoPrice" < v."salePrice"
    )`);
  }
  return Prisma.join(parts, " AND ");
}

function shopBrowseOrderSql(tri: BrowseSort) {
  if (tri === "price-asc") return Prisma.sql`${EFFECTIVE_PRICE_SQL} ASC NULLS LAST, p.name ASC`;
  if (tri === "price-desc") return Prisma.sql`${EFFECTIVE_PRICE_SQL} DESC NULLS LAST, p.name ASC`;
  if (tri === "newest") return Prisma.sql`p."createdAt" DESC`;
  return Prisma.sql`p.name ASC`;
}

async function browseProductPage(query: BrowseQuery, categoryIds?: string[]) {
  const whereSql = shopBrowseSqlWhere({ q: query.q, categoryIds, vue: query.vue });
  const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Product" p WHERE ${whereSql}
  `;
  const total = Number(countRows[0]?.count ?? 0);
  const meta = catalogPageMeta(total, query.page);
  if (!total) return { ids: [] as string[], ...meta };
  const idRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM "Product" p
    WHERE ${whereSql}
    ORDER BY ${shopBrowseOrderSql(query.tri)}
    LIMIT ${meta.take} OFFSET ${meta.skip}
  `;
  return { ids: idRows.map((row) => row.id), ...meta };
}

export async function browseShopProducts(query: BrowseQuery, forcedCategoryIds?: string[]) {
  let categoryIds = forcedCategoryIds;
  if (!categoryIds?.length && query.rayon) {
    categoryIds = await categoryIdsForSlug(query.rayon);
    if (!categoryIds.length) return paginateItems([], query.page);
  }
  const page = await browseProductPage(query, categoryIds);
  if (!page.ids.length) {
    return { items: [], total: page.total, page: page.page, pages: page.pages };
  }
  const products = await withFlashProductSelect((select) =>
    prisma.product.findMany({
      where: { id: { in: page.ids } },
      select,
    }),
  );
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    items: page.ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    }),
    total: page.total,
    page: page.page,
    pages: page.pages,
  };
}

export async function shopRayons() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
}
