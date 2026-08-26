import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { shopSitemapEntries, SITEMAP_PRODUCT_CAP } from "@/lib/sitemap-shop";

const BASE = process.env.APP_URL ?? "https://nerabeaute.cm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null, deletedAt: null },
        select: { slug: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, deletedAt: null },
        select: { slug: true },
        orderBy: { updatedAt: "desc" },
        take: SITEMAP_PRODUCT_CAP,
      }),
    ]);
    return shopSitemapEntries({ base: BASE, categories, products });
  } catch {
    return shopSitemapEntries({ base: BASE, categories: [], products: [] });
  }
}
