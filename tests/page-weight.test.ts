import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMAGE_MAX_EDGE, IMAGE_WEBP_QUALITY, SHOP_IMAGE_QUALITY } from "../src/lib/image-limits";
import { SHOP_PAGE_SIZE } from "../src/lib/shop-browse";

function src(path: string) {
  return readFileSync(path, "utf8");
}

describe("pages légères (petite connexion)", () => {
  it("compresse les photos catalogue plus petit que 1400 px", () => {
    expect(IMAGE_MAX_EDGE).toBeLessThanOrEqual(960);
    expect(IMAGE_WEBP_QUALITY).toBeLessThanOrEqual(64);
    expect(SHOP_IMAGE_QUALITY).toBe(IMAGE_WEBP_QUALITY);
  });

  it("page la boutique par 12 pour limiter les photos par écran", () => {
    expect(SHOP_PAGE_SIZE).toBe(12);
  });

  it("sert du WebP sans AVIF au premier hit", () => {
    const config = src("next.config.ts");
    expect(config).toMatch(/formats:\s*\["image\/webp"\]/);
    expect(config).not.toMatch(/image\/avif/);
    expect(config).toMatch(/deviceSizes:\s*\[360/);
  });

  it("n’oblige pas toute la boutique à être recalculée à chaque visite", () => {
    expect(src("src/app/(shop)/layout.tsx")).not.toMatch(/force-dynamic/);
    expect(src("src/app/(shop)/page.tsx")).not.toMatch(/force-dynamic/);
    expect(src("src/app/(shop)/layout.tsx")).toMatch(/Suspense/);
  });

  it("garde les cartes produit en Server Component (JS seulement pour le flash)", () => {
    const card = src("src/components/shop/product-card.tsx");
    expect(card.trimStart().startsWith('"use client"')).toBe(false);
    expect(card).toMatch(/prefetch=\{false\}/);
    expect(card).toMatch(/PRODUCT_CARD_SIZES/);
  });

  it("affiche 2 colonnes sur mobile pour des photos plus petites", () => {
    expect(src("src/lib/image-limits.ts")).toMatch(/grid-cols-2/);
    expect(src("src/app/(shop)/boutique/page.tsx")).toMatch(/PRODUCT_GRID_CLASS/);
    expect(src("src/app/(shop)/page.tsx")).toMatch(/PRODUCT_GRID_HOME_CLASS/);
  });

  it("n’envoie pas le gros visuel d’accueil sur téléphone", () => {
    const logo = src("src/components/brand/logo.tsx");
    const hero = logo.slice(logo.indexOf("export function HeroProducts"));
    expect(hero).toMatch(/hidden/);
    expect(hero).toMatch(/md:block/);
    expect(hero).toMatch(/max-width: 767px\) 1px/);
    expect(src("src/app/(shop)/page.tsx")).toMatch(/BrandLogo size="lg" className="mb-6 hidden md:block"/);
  });

  it("compacte l’en-tête mobile : une seule rangée de rayons, sans préchargement", () => {
    const chrome = src("src/components/shop/chrome.tsx");
    expect(chrome).toMatch(/overflow-x-auto/);
    expect(chrome).toMatch(/prefetch=\{false\}/);
    expect(src("src/components/shop/trust-badges.tsx").trimStart().startsWith('"use client"')).toBe(false);
  });

  it("ne charge plus 80 produits pour une fiche rayon", () => {
    expect(src("src/lib/catalog-cache.ts")).not.toMatch(/take:\s*80/);
    expect(src("src/lib/catalog-cache.ts")).toMatch(/take: 6/);
  });

  it("garde les visuels de marque sous un budget fichier", () => {
    expect(statSync("public/brand/nera-hero-products.jpg").size).toBeLessThan(120 * 1024);
    expect(statSync("public/icons/icon-512.png").size).toBeLessThan(80 * 1024);
    expect(statSync("public/icons/icon-192.png").size).toBeLessThan(30 * 1024);
  });
});
