import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { getSiteUrl } from "../src/lib/site-url";
import {
  SITEMAP_PRODUCT_CAP,
  renderSitemapXml,
  shopSitemapEntries,
  type ShopSitemapEntry,
} from "../src/lib/sitemap-shop";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const OUT = join(process.cwd(), "public", "sitemap.xml");

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

function fallbackEntries(): ShopSitemapEntry[] {
  return shopSitemapEntries({ base: getSiteUrl(), categories: [], products: [] });
}

function writeXml(entries: ShopSitemapEntry[]) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, renderSitemapXml(entries), "utf8");
  console.log(`write-sitemap: ${entries.length} URLs → ${OUT}`);
}

async function loadShopEntries(): Promise<ShopSitemapEntry[]> {
  if (!process.env.DATABASE_URL) {
    console.warn("write-sitemap: DATABASE_URL manquant, sitemap minimal");
    return fallbackEntries();
  }

  const prisma = new PrismaClient({ log: ["error"] });
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
      15000,
    );
    return shopSitemapEntries({ base: getSiteUrl(), categories, products });
  } catch (err) {
    console.warn("write-sitemap: Prisma indisponible, sitemap minimal", err);
    return fallbackEntries();
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  try {
    writeXml(await loadShopEntries());
  } catch (err) {
    console.warn("write-sitemap: échec inattendu, sitemap minimal", err);
    writeXml(fallbackEntries());
  }
}

void main();
