export const SITEMAP_PRODUCT_CAP = 5000;

export function shopSitemapEntries(input: {
  base: string;
  categories: { slug: string; updatedAt?: Date | string }[];
  products: { slug: string; updatedAt?: Date | string }[];
}) {
  const base = input.base.replace(/\/$/, "");
  const lastMod = (value?: Date | string) => {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  const staticPages = [
    { url: `${base}/`, changeFrequency: "daily" as const, priority: 1 },
    { url: `${base}/a-propos`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${base}/flash`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${base}/boutique`, changeFrequency: "daily" as const, priority: 0.8 },
  ];
  const categories = input.categories.map((row) => ({
    url: `${base}/categorie/${row.slug}`,
    lastModified: lastMod(row.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const products = input.products.slice(0, SITEMAP_PRODUCT_CAP).map((row) => ({
    url: `${base}/produit/${row.slug}`,
    lastModified: lastMod(row.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...staticPages, ...categories, ...products];
}
