export const SITEMAP_PRODUCT_CAP = 5000;
/** Cache CDN 1 h une fois le fichier généré au build. */
export const SITEMAP_REVALIDATE_SECONDS = 3600;

export type ShopSitemapEntry = {
  url: string;
  lastModified?: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
};

/** W3C datetime sans millisecondes — Search Console refuse parfois `.249Z`. */
export function sitemapLastmod(value?: Date | string) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function shopSitemapEntries(input: {
  base: string;
  categories: { slug: string; updatedAt?: Date | string }[];
  products: { slug: string; updatedAt?: Date | string }[];
}): ShopSitemapEntry[] {
  const base = input.base.replace(/\/$/, "");
  const staticPages: ShopSitemapEntry[] = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/a-propos`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/flash`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/boutique`, changeFrequency: "daily", priority: 0.8 },
  ];
  const categories: ShopSitemapEntry[] = input.categories.map((row) => ({
    url: `${base}/categorie/${row.slug}`,
    lastModified: sitemapLastmod(row.updatedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const products: ShopSitemapEntry[] = input.products.slice(0, SITEMAP_PRODUCT_CAP).map((row) => ({
    url: `${base}/produit/${row.slug}`,
    lastModified: sitemapLastmod(row.updatedAt),
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...staticPages, ...categories, ...products];
}

export function renderSitemapXml(entries: ShopSitemapEntry[]) {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? `\n    <lastmod>${escapeXml(entry.lastModified)}</lastmod>`
        : "";
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${lastmod}
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
