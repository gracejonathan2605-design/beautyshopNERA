import { describe, expect, it } from "vitest";
import { catalogHommeShelfHint, catalogShelfHint, catalogSlugs, CLOSURES_SLUG, hommeTargetFromOldCategory, LINGERIE_SLUG, NERA_CATALOG } from "../src/lib/catalog";

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
        "Homme",
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

  it("range toute la panoplie homme dans un rayon dédié, sans doublon ailleurs", () => {
    const homme = NERA_CATALOG.find((g) => g.slug === "homme");
    const parfumerie = NERA_CATALOG.find((g) => g.slug === "parfumerie");
    const accessoires = NERA_CATALOG.find((g) => g.slug === "accessoires-bijoux");
    expect(homme?.children.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "Parfums",
        "Déodorants",
        "Crème de rasage",
        "Après-rasage",
        "Rasoirs et lames",
        "Huile pour barbe",
      ]),
    );
    expect(parfumerie?.children.map((c) => c.name)).not.toContain("Parfums homme");
    expect(accessoires?.children.every((c) => !/homme/i.test(c.name))).toBe(true);
    expect(NERA_CATALOG.filter((g) => g.slug === "homme")).toHaveLength(1);
    expect(catalogHommeShelfHint("Parfum homme NERA")).toBe("homme-parfums");
    expect(catalogHommeShelfHint("Crème de rasage")).toBe("homme-creme-de-rasage");
    expect(catalogHommeShelfHint("Après-rasage mentholé")).toBe("homme-apres-rasage");
    expect(catalogHommeShelfHint("Déodorant homme")).toBe("homme-deodorants");
    expect(catalogHommeShelfHint("Ceintures Hommes")).toBe("homme-ceintures");
    expect(catalogHommeShelfHint("Parfum femme")).toBeNull();
    expect(catalogHommeShelfHint("Ceinture femme cuir")).toBeNull();
    expect(hommeTargetFromOldCategory("Parfums homme", "parfumerie-parfums-homme")).toBe("homme-parfums");
    expect(hommeTargetFromOldCategory("Ceintures Hommes", "ceintures-hommes-2834")).toBe("homme-ceintures");
    expect(hommeTargetFromOldCategory("Ceintures femme", "accessoires-bijoux-ceintures-femme")).toBeNull();
  });
});
