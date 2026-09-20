import { describe, expect, it } from "vitest";
import {
  applyUniquePublicTitles,
  catalogDuplicateKey,
  cleanProductTitle,
  gtinFromSkuOrBarcode,
  inferBrandFromName,
  planCatalogHygiene,
  publishOnlineBlocker,
} from "../src/lib/catalog-hygiene";

describe("hygiène catalogue", () => {
  it("retire les tailles du titre et Chanel/Hermès des accessoires", () => {
    expect(
      cleanProductTitle("Lingerie sexy féminine disponible en S M L XL XXL XXXL XXXXL").name,
    ).toBe("Lingerie féminine");
    expect(
      cleanProductTitle("lingerie sexy féminine disponible en S,M,L,XL,XXL,XXXL,XXXXL").sizes,
    ).toEqual(["S", "M", "L", "XL", "XXL", "3XL", "4XL"]);
    expect(cleanProductTitle("Sac Chanel").name).toBe("Sac à main");
    expect(cleanProductTitle("Sac Chanel").name.toLowerCase()).not.toMatch(/chanel/);
    expect(cleanProductTitle("Sandale hermes femmes avec carton").name).toBe("Sandale femme");
    expect(cleanProductTitle("gourde STANLEY en acier inoxidable").name).toMatch(/inoxydable/i);
    expect(cleanProductTitle("baume et lait lipakar ( la roche posay)").name).toMatch(/Lipikar/);
    expect(cleanProductTitle("baume et lait lipakar ( la roche posay)").name).toMatch(/La Roche-Posay/);
  });

  it("regroupe les doublons lingerie / minaudière / xuping", () => {
    expect(catalogDuplicateKey("Lingerie sexy féminine disponible en S M L XL")).toBe(
      catalogDuplicateKey("Lingerie féminine sexy"),
    );
    expect(catalogDuplicateKey("Minaudière de soirée chic et classe")).toBe(
      catalogDuplicateKey("Minaudiere de soiree chic et classe"),
    );
    expect(catalogDuplicateKey("Boucles d'oreilles xuping en acier inoxydable")).toBe(
      catalogDuplicateKey("Boucles d’oreilles Xuping en acier inoxydable"),
    );
  });

  it("interdit une publication boutique vide", () => {
    expect(publishOnlineBlocker({ onlineVisible: true, photoCount: 0, shortDescription: "ok" })).toMatch(/photo/);
    expect(publishOnlineBlocker({ onlineVisible: true, photoCount: 1, shortDescription: "" })).toMatch(/description/);
    expect(publishOnlineBlocker({ onlineVisible: false, photoCount: 0, shortDescription: "" })).toBeNull();
    expect(publishOnlineBlocker({ onlineVisible: true, photoCount: 1, shortDescription: "Gloss hydratant." })).toBeNull();
  });

  it("dépublie les doublons et complète 20 fiches phares", () => {
    const now = new Date("2026-01-01");
    const products = [
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `ling-${i}`,
        name: "Lingerie sexy féminine disponible en S M L XL XXL XXXL XXXXL",
        shortDescription: null,
        description: null,
        onlineVisible: true,
        isFeatured: false,
        photoCount: i === 0 ? 2 : 1,
        createdAt: now,
      })),
      {
        id: "chanel",
        name: "Sac Chanel",
        shortDescription: null,
        description: null,
        onlineVisible: true,
        isFeatured: false,
        photoCount: 1,
        createdAt: now,
      },
      {
        id: "meche",
        name: "Mèche brésilienne Body Wave",
        shortDescription: null,
        description: null,
        onlineVisible: true,
        isFeatured: true,
        photoCount: 1,
        createdAt: now,
      },
    ];
    const plan = planCatalogHygiene(products, 20);
    expect(plan.unpublish.length).toBe(5);
    expect(plan.merge.length).toBe(5);
    expect(plan.merge.every((row) => row.toId === "ling-0")).toBe(true);
    expect(plan.rename.some((row) => row.id === "chanel" && row.to === "Sac à main")).toBe(true);
    expect(plan.feature).toContain("meche");
    expect(plan.sheets.some((row) => row.id === "meche")).toBe(true);
  });

  it("dépublie les fiches en ligne sans description hors sélection phare", () => {
    const now = new Date("2026-01-01");
    const products = Array.from({ length: 25 }, (_, i) => ({
      id: `p-${i}`,
      name: `Produit unique ${i}`,
      shortDescription: null,
      description: null,
      onlineVisible: true,
      isFeatured: false,
      photoCount: 1,
      createdAt: now,
    }));
    const plan = planCatalogHygiene(products, 20);
    expect(plan.unpublish.length).toBe(5);
    expect(plan.unpublish.every((row) => /description/i.test(row.reason))).toBe(true);
    expect(plan.sheets.length).toBeGreaterThan(0);
  });

  it("lit une marque et un GTIN seulement s’ils sont déjà dans la fiche", () => {
    expect(inferBrandFromName("Crème CeraVe hydratante")).toBe("CeraVe");
    expect(inferBrandFromName("Sérum Nakae")).toBe("Nakae Beauté");
    expect(inferBrandFromName("Gourde Stanley inoxydable")).toBe("Stanley");
    expect(inferBrandFromName("Savon")).toBeNull();
    expect(inferBrandFromName("Parfum")).toBeNull();
    expect(gtinFromSkuOrBarcode(null, "6131234567890")).toBe("6131234567890");
    expect(gtinFromSkuOrBarcode(null, "GLOSS-01")).toBeUndefined();
    const now = new Date("2026-01-01");
    const plan = planCatalogHygiene(
      [
        {
          id: "cerave",
          name: "Lait CeraVe",
          sku: "6131234567890",
          brandId: null,
          shortDescription: "Lait corporel.",
          description: "Lait corporel CeraVe.",
          onlineVisible: true,
          isFeatured: false,
          photoCount: 1,
          createdAt: now,
          variants: [{ id: "v1", sku: "6131234567890", barcode: null, name: "Default" }],
        },
      ],
      20,
    );
    expect(plan.brands).toEqual([{ id: "cerave", brandName: "CeraVe" }]);
    expect(plan.barcodes).toEqual([{ variantId: "v1", barcode: "6131234567890" }]);
  });

  it("distingue les H1 tant que des fiches identiques restent séparées", () => {
    const titles = applyUniquePublicTitles([
      { id: "a", name: "Lingerie féminine", sku: "LIN-1", slug: "lingerie-feminine" },
      { id: "b", name: "Lingerie féminine", sku: "LIN-2", slug: "lingerie-feminine-2" },
      { id: "c", name: "Savon", sku: null, slug: "savon" },
    ]);
    expect(titles[0].name).toBe("Lingerie féminine · LIN-1");
    expect(titles[1].name).toBe("Lingerie féminine · LIN-2");
    expect(titles[2].name).toBe("Savon");
  });
});
