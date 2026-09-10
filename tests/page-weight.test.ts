import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMAGE_MAX_EDGE, IMAGE_WEBP_QUALITY, SHOP_IMAGE_QUALITY } from "../src/lib/image-limits";
import { SHOP_PAGE_SIZE } from "../src/lib/shop-browse";

function src(path: string) {
  return readFileSync(path, "utf8");
}

describe("pages légères sans casser l’apparence", () => {
  it("compresse les nouvelles photos catalogue, tout en gardant l’affichage à qualité 75", () => {
    expect(IMAGE_MAX_EDGE).toBeLessThanOrEqual(960);
    expect(IMAGE_WEBP_QUALITY).toBeLessThanOrEqual(64);
    expect(SHOP_IMAGE_QUALITY).toBe(75);
  });

  it("garde 24 produits par page boutique", () => {
    expect(SHOP_PAGE_SIZE).toBe(24);
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
  });

  it("reste sur la grille d’origine : 1 colonne téléphone, 2 dès sm", () => {
    expect(src("src/lib/image-limits.ts")).toMatch(/sm:grid-cols-2/);
    expect(src("src/lib/image-limits.ts")).not.toMatch(/grid grid-cols-2/);
    expect(src("src/components/shop/flash-section.tsx")).toMatch(/snap-x/);
  });

  it("affiche le hero, le logo, le texte et À propos aussi sur téléphone", () => {
    const home = src("src/app/(shop)/page.tsx");
    expect(home).toMatch(/BrandLogo size="lg" priority className="mb-6"/);
    expect(home).toContain("{NERA_PITCH}");
    expect(home).not.toMatch(/hidden md:block/);
    expect(home).toMatch(/À propos/);
    const hero = src("src/components/brand/logo.tsx").slice(
      src("src/components/brand/logo.tsx").indexOf("export function HeroProducts"),
    );
    expect(hero).not.toMatch(/hidden md:block/);
    expect(hero).toMatch(/100vw/);
  });

  it("ne charge plus 80 produits pour une fiche rayon", () => {
    expect(src("src/lib/catalog-cache.ts")).not.toMatch(/take:\s*80/);
    expect(src("src/lib/catalog-cache.ts")).toMatch(/take: 8/);
  });

  it("garde les visuels de marque sous un budget fichier", () => {
    expect(statSync("public/brand/nera-hero-products.jpg").size).toBeLessThan(120 * 1024);
    expect(statSync("public/icons/icon-512.png").size).toBeLessThan(80 * 1024);
    expect(statSync("public/icons/icon-192.png").size).toBeLessThan(30 * 1024);
  });
});
