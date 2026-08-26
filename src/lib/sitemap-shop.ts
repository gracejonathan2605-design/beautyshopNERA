export const SITEMAP_PRODUCT_CAP = 5000;

export function shopSitemapEntries(input: {
  base: string;
  categories: { slug: string }[];
  products: { slug: string }[];
}) {
  const base = input.base.replace(/\/$/, "");
  const staticPages = [
    { url: `${base}/`, changeFrequency: "daily" as const, priority: 1 },
    { url: `${base}/flash`, changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${base}/boutique`, changeFrequency: "daily" as const, priority: 0.8 },
  ];
  const categories = input.categories.map((row) => ({
    url: `${base}/categorie/${row.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const products = input.products.slice(0, SITEMAP_PRODUCT_CAP).map((row) => ({
    url: `${base}/produit/${row.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...staticPages, ...categories, ...products];
}
