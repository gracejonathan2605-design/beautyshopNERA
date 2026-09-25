import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { catalogSlugs, mergeNavCategories } from "@/lib/catalog";
import { applyUniquePublicTitles, catalogDuplicateKey } from "@/lib/catalog-hygiene";
import { ensureNeraCatalog, scheduleEnsureNeraCatalog } from "@/lib/catalog-ensure";
import { isMissingFlashColumn, productCardSelect, shopInventorySelect, withFlashProductSelect } from "@/lib/product-query";
import { flashPrismaWhere } from "@/lib/flash";

const navCategorySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

const categoryPageSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isActive: true,
  deletedAt: true,
  parent: { select: { name: true, slug: true } },
  children: {
    where: { isActive: true, deletedAt: null },
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, name: true, slug: true },
  },
} as const;

export function getActiveFlashProducts(take = 8) {
  return unstable_cache(
    async () => {
      const now = new Date();
      try {
        const rows = await prisma.product.findMany({
          where: flashPrismaWhere(now),
          select: productCardSelect,
          orderBy: { flashStartAt: "desc" },
          take,
        });
        return applyUniquePublicTitles(rows);
      } catch (err) {
        if (isMissingFlashColumn(err)) return [];
        throw err;
      }
    },
    ["flash-products", String(take)],
    { revalidate: 45, tags: ["catalog"] },
  )();
}

const loadNavCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { isActive: true, parentId: null, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: navCategorySelect,
    }),
  ["nav-categories", "nera-v2"],
  { revalidate: 60, tags: ["catalog"] },
);

export async function getNavCategories() {
  scheduleEnsureNeraCatalog();
  const rows = await loadNavCategories();
  return mergeNavCategories(rows);
}

const loadHomeCatalog = unstable_cache(
  async () => {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
    return withFlashProductSelect(async (select) => {
      const featured = await prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, isFeatured: true, deletedAt: null },
        select,
        take: 8,
      });
      const news = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          onlineVisible: true,
          deletedAt: null,
          isNew: true,
          createdAt: { gte: since },
        },
        select,
        take: 8,
        orderBy: { createdAt: "desc" },
      });
      const promos = await prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, isPromo: true, deletedAt: null },
        select,
        take: 8,
      });
      const categories = await prisma.category.findMany({
        where: { isActive: true, parentId: null, deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: navCategorySelect,
      });
      const looks = await prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, deletedAt: null },
        select: {
          ...select,
          category: { select: { slug: true, parent: { select: { slug: true } } } },
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 48,
      });
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sold = await prisma.orderItem.findMany({
        where: {
          order: { createdAt: { gte: weekAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        },
        select: { quantity: true, variant: { select: { productId: true } } },
        take: 300,
      });
      const counts = new Map<string, number>();
      for (const row of sold) {
        const id = row.variant.productId;
        counts.set(id, (counts.get(id) ?? 0) + row.quantity);
      }
      const popularIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([id]) => id);
      return { featured, news, promos, categories, looks, popularIds };
    });
  },
  ["home-catalog", "nera-v3"],
  { revalidate: 45, tags: ["catalog"] },
);

export async function getHomeCatalog() {
  scheduleEnsureNeraCatalog();
  const catalog = await loadHomeCatalog();
  return {
    featured: applyUniquePublicTitles(catalog.featured),
    news: applyUniquePublicTitles(catalog.news),
    promos: applyUniquePublicTitles(catalog.promos),
    categories: mergeNavCategories(catalog.categories),
    looks: applyUniquePublicTitles(catalog.looks),
    popularIds: catalog.popularIds,
  };
}

const loadPartnerBrands = unstable_cache(
  async () => {
    const { listPublicPartnerBrands } = await import("@/services/partner-brand.service");
    return listPublicPartnerBrands();
  },
  ["partner-brands"],
  { revalidate: 60, tags: ["catalog"] },
);

export function getCachedPartnerBrands() {
  return loadPartnerBrands();
}

export function getCachedProductPage(slug: string) {
  return unstable_cache(
    async () => {
      try {
        return await prisma.product.findUnique({
          where: { slug },
          select: productPageSelect,
        });
      } catch (err) {
        if (!isMissingFlashColumn(err)) throw err;
        const row = await prisma.product.findUnique({
          where: { slug },
          select: productPageSelectWithoutFlash,
        });
        if (!row) return null;
        return { ...row, flashStartAt: null, flashEndAt: null };
      }
    },
    ["product-page", slug],
    { revalidate: 60, tags: ["catalog"] },
  )();
}

const productPageSelectWithoutFlash = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  description: true,
  shortDescription: true,
  status: true,
  onlineVisible: true,
  deletedAt: true,
  isNew: true,
  isPromo: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { name: true, slug: true, isPartner: true, showOnSite: true } },
  variants: {
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      salePrice: true,
      promoPrice: true,
      barcode: true,
      inventories: shopInventorySelect,
    },
  },
  images: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, url: true, alt: true, kind: true },
  },
} as const;

const productPageSelect = {
  ...productPageSelectWithoutFlash,
  flashStartAt: true,
  flashEndAt: true,
} as const;

const loadCategoryPage = (slug: string) =>
  unstable_cache(
    async () => {
      const category = await prisma.category.findUnique({
        where: { slug },
        select: categoryPageSelect,
      });
      if (!category || category.deletedAt || !category.isActive) return null;
      return { category };
    },
    ["category-page", slug, "nera-v2"],
    { revalidate: 45, tags: ["catalog"] },
  )();

export async function getCachedCategoryPage(slug: string) {
  const cached = await loadCategoryPage(slug);
  if (cached) return cached;
  if (!catalogSlugs().includes(slug)) return null;
  const ok = await ensureNeraCatalog();
  if (!ok) return null;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: categoryPageSelect,
  });
  if (!category || category.deletedAt || !category.isActive) return null;
  return { category };
}

export function getRelatedProducts(productId: string, categoryId: string | null, take = 4) {
  if (!categoryId) return Promise.resolve([]);
  return unstable_cache(
    async () => {
      const rows = await withFlashProductSelect((select) =>
        prisma.product.findMany({
          where: {
            id: { not: productId },
            categoryId,
            status: "ACTIVE",
            onlineVisible: true,
            deletedAt: null,
          },
          select,
          orderBy: { updatedAt: "desc" },
          take,
        }),
      );
      return applyUniquePublicTitles(rows);
    },
    ["related-products", productId, categoryId, String(take)],
    { revalidate: 60, tags: ["catalog"] },
  )();
}

export type CatalogDuplicateIdentity = {
  redirects: Record<string, string>;
  collidingIds: string[];
};

const loadCatalogDuplicateIdentity = unstable_cache(
  async (): Promise<CatalogDuplicateIdentity> => {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        onlineVisible: true,
        status: true,
        isFeatured: true,
        createdAt: true,
        images: { where: { kind: "IMAGE" }, select: { id: true } },
      },
    });
    const groups = new Map<string, typeof products>();
    for (const product of products) {
      const key = catalogDuplicateKey(product.name);
      const list = groups.get(key) ?? [];
      list.push(product);
      groups.set(key, list);
    }
    const redirects: Record<string, string> = {};
    const collidingIds: string[] = [];
    for (const group of groups.values()) {
      const ranked = [...group].sort((a, b) => {
        if (b.images.length !== a.images.length) return b.images.length - a.images.length;
        if (Number(b.isFeatured) !== Number(a.isFeatured)) return Number(b.isFeatured) - Number(a.isFeatured);
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      const keeper = ranked.find((row) => row.onlineVisible && row.status === "ACTIVE");
      const online = ranked.filter((row) => row.onlineVisible && row.status === "ACTIVE");
      if (online.length > 1) collidingIds.push(...online.map((row) => row.id));
      if (!keeper) continue;
      for (const extra of ranked) {
        if (extra.slug === keeper.slug || extra.onlineVisible) continue;
        redirects[extra.slug] = keeper.slug;
      }
    }
    return { redirects, collidingIds };
  },
  ["catalog-duplicate-identity"],
  { revalidate: 60, tags: ["catalog"] },
);

export function getCatalogDuplicateIdentity() {
  return loadCatalogDuplicateIdentity();
}

export function getActiveDeliveryZones() {
  return unstable_cache(
    () =>
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true, fee: true },
      }),
    ["delivery-zones"],
    { revalidate: 120, tags: ["catalog"] },
  )();
}
