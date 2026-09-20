import { LEGACY_CATEGORY_REDIRECTS } from "./category-seo";

export const SITEMAP_PRODUCT_CAP = 5000;
/** Revalidation courte : le catalogue change plus souvent qu’un build. */
export const SITEMAP_REVALIDATE_SECONDS = 600;

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

/** Catégories avec au moins un produit en ligne (y compris via un enfant). */
export function categoriesWithOnlineProducts(input: {
  categories: { id: string; slug: string; parentId: string | null; updatedAt?: Date | string }[];
  productCategoryIds: (string | null)[];
}) {
  const byId = new Map(input.categories.map((row) => [row.id, row]));
  const keep = new Set<string>();
  for (const categoryId of input.productCategoryIds) {
    let current = categoryId ? byId.get(categoryId) : undefined;
    while (current) {
      keep.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
  return input.categories.filter((row) => keep.has(row.id) && !LEGACY_CATEGORY_REDIRECTS[row.slug]);
}

export async function loadIndexableSitemapEntries(base: string): Promise<ShopSitemapEntry[]> {
  const fallback = shopSitemapEntries({ base, categories: [], products: [] });
  if (!process.env.DATABASE_URL) return fallback;
  try {
    const { prisma } = await import("./prisma");
    const [categories, products] = await withTimeout(
      Promise.all([
        prisma.category.findMany({
          where: { isActive: true, deletedAt: null },
          select: { id: true, slug: true, parentId: true, updatedAt: true },
        }),
        prisma.product.findMany({
          where: { status: "ACTIVE", onlineVisible: true, deletedAt: null },
          select: { slug: true, updatedAt: true, categoryId: true },
          orderBy: { updatedAt: "desc" },
          take: SITEMAP_PRODUCT_CAP,
        }),
      ]),
      15000,
    );
    const indexableCategories = categoriesWithOnlineProducts({
      categories,
      productCategoryIds: products.map((row) => row.categoryId),
    });
    return shopSitemapEntries({
      base,
      categories: indexableCategories,
      products,
    });
  } catch (err) {
    console.warn("sitemap: catalogue indisponible, URLs statiques seulement", err);
    return fallback;
  }
}
