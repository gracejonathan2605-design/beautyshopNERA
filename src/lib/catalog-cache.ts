import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { catalogSlugs, mergeNavCategories } from "@/lib/catalog";
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
        return await prisma.product.findMany({
          where: flashPrismaWhere(now),
          select: productCardSelect,
          orderBy: { flashStartAt: "desc" },
          take,
        });
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
      return { featured, news, promos, categories };
    });
  },
  ["home-catalog", "nera-v2"],
  { revalidate: 45, tags: ["catalog"] },
);

export async function getHomeCatalog() {
  scheduleEnsureNeraCatalog();
  const catalog = await loadHomeCatalog();
  return { ...catalog, categories: mergeNavCategories(catalog.categories) };
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
  brand: { select: { name: true } },
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
    async () =>
      withFlashProductSelect((select) =>
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
      ),
    ["related-products", productId, categoryId, String(take)],
    { revalidate: 60, tags: ["catalog"] },
  )();
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
