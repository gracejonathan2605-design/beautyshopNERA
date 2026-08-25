import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isMissingFlashColumn, productCardSelect, withFlashProductSelect } from "@/lib/product-query";
import { flashPrismaWhere } from "@/lib/flash";

export async function getActiveFlashProducts(take = 16) {
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
          take: 8,
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
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.product.findMany({
          where: { status: "ACTIVE", onlineVisible: true, isPromo: true, deletedAt: null },
          select,
          take: 8,
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
        return prisma.product.findUnique({
          where: { slug },
          select: productPageSelectWithoutFlash,
        });
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
  description: true,
  shortDescription: true,
  status: true,
  onlineVisible: true,
  deletedAt: true,
  isNew: true,
  isPromo: true,
  category: { select: { name: true } },
  variants: {
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      salePrice: true,
      promoPrice: true,
      inventories: { select: { onHand: true, reserved: true } },
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
      const childIds = category.children.map((c) => c.id);
      const grand = childIds.length
        ? await prisma.category.findMany({
            where: { parentId: { in: childIds }, isActive: true, deletedAt: null },
            select: { id: true },
          })
        : [];
      const products = await withFlashProductSelect((select) =>
        prisma.product.findMany({
          where: {
            status: "ACTIVE",
            onlineVisible: true,
            deletedAt: null,
            categoryId: { in: [category.id, ...childIds, ...grand.map((g) => g.id)] },
          },
          select,
          orderBy: { name: "asc" },
          take: 80,
        }),
      );
      return { category, products };
    },
    ["category-page", slug],
    { revalidate: 45, tags: ["catalog"] },
  )();
}
