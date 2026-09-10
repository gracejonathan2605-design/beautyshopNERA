import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { shopSitemapEntries, SITEMAP_PRODUCT_CAP } from "@/lib/sitemap-shop";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", onlineVisible: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: SITEMAP_PRODUCT_CAP,
      }),
    ]);
    return shopSitemapEntries({ base, categories, products });
  } catch {
    return shopSitemapEntries({ base, categories: [], products: [] });
  }
}
