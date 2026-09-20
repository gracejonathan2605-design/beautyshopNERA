import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { loadIndexableSitemapEntries, SITEMAP_REVALIDATE_SECONDS } from "@/lib/sitemap-shop";

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await loadIndexableSitemapEntries(getSiteUrl());
  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
