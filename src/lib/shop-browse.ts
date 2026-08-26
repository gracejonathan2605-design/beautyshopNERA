import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withFlashProductSelect } from "@/lib/product-query";
import { displayUnitPrice } from "@/lib/stock-display";
import { unitPrice } from "@/lib/pricing";

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

export function paginateItems<T>(items: T[], page: number, size = SHOP_PAGE_SIZE) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size) || 1);
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * size;
  return { items: items.slice(start, start + size), total, page: safePage, pages };
}

export async function browseShopProducts(query: BrowseQuery, forcedCategoryIds?: string[]) {
  let categoryIds = forcedCategoryIds;
  if (!categoryIds?.length && query.rayon) {
    categoryIds = await categoryIdsForSlug(query.rayon);
    if (!categoryIds.length) return paginateItems([], query.page);
  }
  const products = await withFlashProductSelect((select) =>
    prisma.product.findMany({
      where: shopProductWhere({ q: query.q, categoryIds, vue: query.vue }),
      select,
    }),
  );
  const visible =
    query.vue === "promo"
      ? products.filter((product) => product.variants.some((variant) => unitPrice(variant) < variant.salePrice))
      : products;
  const sorted = sortShopProducts(visible, query.tri);
  return paginateItems(sorted, query.page);
}

export async function shopRayons() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
}
