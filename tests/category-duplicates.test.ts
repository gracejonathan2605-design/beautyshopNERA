import { describe, expect, it } from "vitest";
import { categoryNameKey, categoryNameTaken, planDuplicateCategoryMerges } from "../src/lib/category-duplicates";

const official = new Set(["meches-perruques-extensions-perruques"]);

describe("sous-rayons en double", () => {
  it("ignore la casse, les accents et les espaces", () => {
    expect(categoryNameKey("  Perruque   Nigéria ")).toBe(categoryNameKey("perruque nigeria"));
    expect(categoryNameKey("Mèche sac")).toBe(categoryNameKey("Meche sac"));
    expect(categoryNameKey("Bijoux hommes")).not.toBe(categoryNameKey("Bijoux"));
    expect(categoryNameKey("Bijoux de poche")).not.toBe(categoryNameKey("Bijoux"));
  });

  it("refuse un nom déjà pris dans le même rayon", () => {
    const rows = [{ id: "a", name: "Perruque Nigeria" }];
    expect(categoryNameTaken(rows, "perruque nigeria")).toBe(true);
    expect(categoryNameTaken(rows, "perruque nigeria", "a")).toBe(false);
    expect(categoryNameTaken(rows, "Perruques")).toBe(false);
  });

  it("fusionne les doublons d’un même parent et garde le rayon officiel", () => {
    const plans = planDuplicateCategoryMerges(
      [
        {
          id: "copie",
          name: "Perruques",
          slug: "perruques-4821",
          parentId: "meches",
          productCount: 4,
          sortOrder: 9,
        },
        {
          id: "officiel",
          name: "Perruques",
          slug: "meches-perruques-extensions-perruques",
          parentId: "meches",
          productCount: 1,
          sortOrder: 1,
        },
        {
          id: "autre",
          name: "Perruques",
          slug: "homme-perruques",
          parentId: "homme",
          productCount: 2,
          sortOrder: 1,
        },
      ],
      official,
    );
    expect(plans).toEqual([{ keeperId: "officiel", duplicateIds: ["copie"] }]);
  });

  it("sans rayon officiel, garde celui qui a le plus de produits", () => {
    const plans = planDuplicateCategoryMerges([
      { id: "vide", name: "Bijoux hommes", slug: "bijoux-hommes-1000", parentId: "acc", productCount: 0, sortOrder: 1 },
      { id: "plein", name: "bijoux hommes", slug: "bijoux-hommes-2000", parentId: "acc", productCount: 3, sortOrder: 2 },
      { id: "sac", name: "Mèche sac", slug: "meche-sac", parentId: "acc", productCount: 1, sortOrder: 3 },
    ]);
    expect(plans).toEqual([{ keeperId: "plein", duplicateIds: ["vide"] }]);
  });
});
