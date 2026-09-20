import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  NAKAE_BEAUTE_INTRO,
  NAKAE_BEAUTE_NAME,
  NAKAE_BEAUTE_SLUG,
  partnerBrandMetaDescription,
  partnerBrandPageTitle,
  partnerBrandPath,
  publicPartnerBrand,
  uniqueBrandSlug,
} from "../src/lib/partner-brands";
import { inferBrandFromName } from "../src/lib/catalog-hygiene";
import { shopSitemapEntries } from "../src/lib/sitemap-shop";

describe("marques partenaires", () => {
  it("fixe Nakae Beauté sans inventer de contenu", () => {
    expect(NAKAE_BEAUTE_NAME).toBe("Nakae Beauté");
    expect(NAKAE_BEAUTE_SLUG).toBe("nakae-beaute");
    expect(NAKAE_BEAUTE_INTRO).toBe(
      "Découvrez la sélection Nakae Beauté disponible chez NERA Beauté & Shop.",
    );
    expect(partnerBrandPath(NAKAE_BEAUTE_SLUG)).toBe("/marques/nakae-beaute");
    expect(partnerBrandPageTitle(NAKAE_BEAUTE_NAME)).toBe("Nakae Beauté × NERA Beauté & Shop");
    expect(partnerBrandMetaDescription({ name: NAKAE_BEAUTE_NAME, description: NAKAE_BEAUTE_INTRO })).toBe(
      NAKAE_BEAUTE_INTRO,
    );
  });

  it("n’affiche une marque partenaire que si elle est publiée", () => {
    expect(
      publicPartnerBrand({ isPartner: true, showOnSite: true, isActive: true, deletedAt: null }),
    ).toBe(true);
    expect(
      publicPartnerBrand({ isPartner: false, showOnSite: true, isActive: true, deletedAt: null }),
    ).toBe(false);
    expect(
      publicPartnerBrand({ isPartner: true, showOnSite: false, isActive: true, deletedAt: null }),
    ).toBe(false);
  });

  it("dérive un slug unique depuis le nom", () => {
    expect(uniqueBrandSlug("Nakae Beauté")).toBe("nakae-beaute");
    expect(uniqueBrandSlug("Marque B", "marque-b")).toBe("marque-b");
  });

  it("reconnaît Nakae Beauté dans le nom d’un produit", () => {
    expect(inferBrandFromName("Sérum Nakae")).toBe("Nakae Beauté");
  });

  it("ajoute /marques au sitemap sans panier ni checkout", () => {
    const urls = shopSitemapEntries({
      base: "https://www.nerabeaute237.com",
      categories: [],
      products: [],
      brands: [{ slug: "nakae-beaute" }],
    }).map((row) => row.url);
    expect(urls).toContain("https://www.nerabeaute237.com/marques");
    expect(urls).toContain("https://www.nerabeaute237.com/marques/nakae-beaute");
    expect(urls.some((url) => url.includes("/panier") || url.includes("/admin"))).toBe(false);
  });

  it("relie la boutique publique et l’admin aux pages marque", () => {
    const home = readFileSync("src/app/(shop)/page.tsx", "utf8");
    const chrome = readFileSync("src/components/shop/chrome.tsx", "utf8");
    const admin = readFileSync("src/components/admin/shell.tsx", "utf8");
    expect(home).toContain("PartnerBrandsSection");
    expect(chrome).toContain("/marques");
    expect(admin).toContain("Marques partenaires");
    expect(readFileSync("src/app/(shop)/marques/[slug]/page.tsx", "utf8")).toContain("partnerBrandIntro");
    expect(readFileSync("src/app/(shop)/marques/[slug]/page.tsx", "utf8")).not.toMatch(/commission NERA|prix fournisseur/i);
  });
});
