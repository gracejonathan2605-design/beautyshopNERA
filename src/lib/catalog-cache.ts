import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { productCardSelect } from "@/lib/product-query";
import { flashPrismaWhere } from "@/lib/flash";

export async function getActiveFlashProducts(take = 16) {
  const now = new Date();
  return prisma.product.findMany({
    where: flashPrismaWhere(now),
    select: productCardSelect,
    orderBy: { flashStartAt: "desc" },
    take,
  });
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
    const [featured, news, promos, categories] = await Promise.all([
      prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, isFeatured: true, deletedAt: null },
        select: productCardSelect,
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
        select: productCardSelect,
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, isPromo: true, deletedAt: null },
        select: productCardSelect,
        take: 8,
      }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null, deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
    ]);
    return { featured, news, promos, categories };
  },
  ["home-catalog"],
  { revalidate: 45, tags: ["catalog"] },
);

export function getCachedProductPage(slug: string) {
  return unstable_cache(
    async () =>
      prisma.product.findUnique({
        where: { slug },
        select: {
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
          flashStartAt: true,
          flashEndAt: true,
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
        },
      }),
    ["product-page", slug],
    { revalidate: 60, tags: ["catalog"] },
  )();
}

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
      const products = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          onlineVisible: true,
          deletedAt: null,
          categoryId: { in: [category.id, ...childIds, ...grand.map((g) => g.id)] },
        },
        select: productCardSelect,
        orderBy: { name: "asc" },
        take: 80,
      });
      return { category, products };
    },
    ["category-page", slug],
    { revalidate: 45, tags: ["catalog"] },
  )();
}
