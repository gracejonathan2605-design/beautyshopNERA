import { describe, expect, it } from "vitest";
import {
  catalogDuplicateKey,
  cleanProductTitle,
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
    expect(plan.rename.some((row) => row.id === "chanel" && row.to === "Sac à main")).toBe(true);
    expect(plan.feature).toContain("meche");
    expect(plan.sheets.some((row) => row.id === "meche")).toBe(true);
  });
});
