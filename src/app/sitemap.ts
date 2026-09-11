import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { shopSitemapEntries, SITEMAP_PRODUCT_CAP, SITEMAP_REVALIDATE_SECONDS } from "@/lib/sitemap-shop";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const revalidate = SITEMAP_REVALIDATE_SECONDS;

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("sitemap-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  try {
    const [categories, products] = await withTimeout(
      Promise.all([
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
      ]),
      5000,
    );
    return shopSitemapEntries({ base, categories, products });
  } catch {
    return shopSitemapEntries({ base, categories: [], products: [] });
  }
}
