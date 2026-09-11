import { describe, expect, it } from "vitest";
import { catalogShelfHint, catalogSlugs, CLOSURES_SLUG, LINGERIE_SLUG, NERA_CATALOG } from "../src/lib/catalog";

describe("catalogue NERA", () => {
  it("a des slugs uniques", () => {
    const slugs = catalogSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("couvre les rayons demandés plus ongles, mode et bien-être", () => {
    const names = NERA_CATALOG.map((g) => g.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Cosmétiques & soins",
        "Soins du visage",
        "Mèches, perruques & extensions",
        "Soins capillaires",
        "Maquillage",
        "Parfumerie",
        "Accessoires & bijoux",
        "Hygiène buccale",
        "Ongles",
        "Bien-être",
        "Mode",
      ]),
    );
    expect(NERA_CATALOG.every((g) => g.children.length > 0)).toBe(true);
  });

  it("ajoute lingerie sous Mode et closures sous Mèches, sans doublon", () => {
    const mode = NERA_CATALOG.find((g) => g.slug === "mode");
    const meches = NERA_CATALOG.find((g) => g.slug === "meches-perruques-extensions");
    expect(mode?.children.map((c) => c.name)).toContain("Lingerie");
    expect(meches?.children.map((c) => c.name)).toContain("Closures");
    expect(mode?.children.filter((c) => c.name === "Lingerie")).toHaveLength(1);
    expect(meches?.children.filter((c) => c.name === "Closures")).toHaveLength(1);
    expect(catalogSlugs()).toContain(LINGERIE_SLUG);
    expect(catalogSlugs()).toContain(CLOSURES_SLUG);
    expect(catalogSlugs()).not.toContain("lingerie");
  });

  it("range lingerie et closures seulement d’après le nom", () => {
    expect(catalogShelfHint("lingerie sexy féminine disponible en S,M,L")).toBe(LINGERIE_SLUG);
    expect(catalogShelfHint("Sous-vêtements coton")).toBe(LINGERIE_SLUG);
    expect(catalogShelfHint("Pixie curly indienne sur closure 5x5")).toBe(CLOSURES_SLUG);
    expect(catalogShelfHint("Frontale 360 qualité supérieure")).toBeNull();
    expect(catalogShelfHint("Sac à main")).toBeNull();
    expect(catalogShelfHint("Colgate")).toBeNull();
  });
});
