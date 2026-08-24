import { describe, expect, it } from "vitest";
import { catalogSlugs, NERA_CATALOG } from "../src/lib/catalog";

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
});
