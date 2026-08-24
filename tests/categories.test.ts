import { describe, expect, it } from "vitest";
import { categoryDeleteBlocker } from "../src/lib/categories";

describe("verrou suppression rayon", () => {
  it("bloque un rayon qui a des sous-rayons", () => {
    expect(categoryDeleteBlocker({ childCount: 2, productCount: 0 })).toMatch(/sous-rayons/);
  });

  it("bloque un rayon qui a des produits", () => {
    expect(categoryDeleteBlocker({ childCount: 0, productCount: 3 })).toMatch(/3 produit/);
  });

  it("autorise un rayon vide", () => {
    expect(categoryDeleteBlocker({ childCount: 0, productCount: 0 })).toBeNull();
  });
});
