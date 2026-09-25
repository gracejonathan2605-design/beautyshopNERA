import { describe, expect, it } from "vitest";
import { combineVariantOptions, detectVariantFamily } from "../src/lib/variant-options";

describe("détection des variantes", () => {
  it("propose la liste qui correspond à l’article", () => {
    expect(detectVariantFamily("Mode Sacs à main")).toBe("sac");
    expect(detectVariantFamily("Mèches, perruques & extensions Mèches brésiliennes")).toBe("meche");
    expect(detectVariantFamily("Mode Chaussures")).toBe("chaussure");
    expect(detectVariantFamily("Mode Sandales")).toBe("chaussure");
    expect(detectVariantFamily("Mode Lingerie")).toBe("vetement");
    expect(detectVariantFamily("Parfumerie Parfums femme")).toBe("parfum");
    expect(detectVariantFamily("Maquillage Fond de teint")).toBe("maquillage");
    expect(detectVariantFamily("Soins du visage Sérums visage")).toBe("autre");
  });

  it("croise plusieurs couleurs et plusieurs tailles", () => {
    expect(combineVariantOptions([["Noir", "Beige"], ["38", "39"]])).toEqual([
      "Noir · 38",
      "Noir · 39",
      "Beige · 38",
      "Beige · 39",
    ]);
  });
});