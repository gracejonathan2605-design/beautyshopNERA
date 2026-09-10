import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isMissingFlashColumn, productCardSelect, shopInventorySelect, withFlashProductSelect } from "@/lib/product-query";
import { flashPrismaWhere } from "@/lib/flash";

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

export const getNavCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { isActive: true, parentId: null, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ["nav-categories"],
  { revalidate: 60, tags: ["catalog"] },
);

export const getHomeCatalog = unstable_cache(
  async () => {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
    return withFlashProductSelect(async (select) => {
      const [featured, news, promos, categories] = await Promise.all([
        prisma.product.findMany({
          where: { status: "ACTIVE", onlineVisible: true, isFeatured: true, deletedAt: null },
          select,
          take: 6,
        }),
        prisma.product.findMany({
          where: {
            status: "ACTIVE",
            onlineVisible: true,
            deletedAt: null,
            isNew: true,
            createdAt: { gte: since },
          },
          select,
          take: 6,
          orderBy: { createdAt: "desc" },
        }),
        prisma.product.findMany({
          where: { status: "ACTIVE", onlineVisible: true, isPromo: true, deletedAt: null },
          select,
          take: 6,
        }),
        prisma.category.findMany({
          where: { isActive: true, parentId: null, deletedAt: null },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, slug: true },
        }),
      ]);
      return { featured, news, promos, categories };
    });
  },
  ["home-catalog"],
  { revalidate: 45, tags: ["catalog"] },
);

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

export function getCachedCategoryPage(slug: string) {
  return unstable_cache(
    async () => {
      const category = await prisma.category.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          deletedAt: true,
          parent: { select: { name: true, slug: true } },
          children: {
            where: { isActive: true, deletedAt: null },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, slug: true },
          },
        },
      });
      if (!category || category.deletedAt || !category.isActive) return null;
      return { category };
    },
    ["category-page", slug],
    { revalidate: 45, tags: ["catalog"] },
  )();
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
