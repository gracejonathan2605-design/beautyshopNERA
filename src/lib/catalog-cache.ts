import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { productCardInclude } from "@/lib/product-query";

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
        include: productCardInclude,
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
        include: productCardInclude,
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, isPromo: true, deletedAt: null },
        include: productCardInclude,
        take: 8,
      }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    return { featured, news, promos, categories };
  },
  ["home-catalog"],
  { revalidate: 45, tags: ["catalog"] },
);
