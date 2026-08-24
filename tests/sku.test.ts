import { describe, expect, it } from "vitest";
import { buildAutoSku, skuBaseFromName } from "../src/lib/sku";

describe("SKU automatique", () => {
  it("construit une base à partir du nom", () => {
    expect(skuBaseFromName("Sérum Glow NERA")).toBe("SERUMGLOWN");
    expect(skuBaseFromName("!!!")).toBe("NER");
  });

  it("génère un SKU unique-looking sans saisie manuelle", () => {
    const sku = buildAutoSku("Huile de coco", 1_700_000_000_000, 0);
    expect(sku.startsWith("HUILEDECOC-")).toBe(true);
    expect(buildAutoSku("Huile de coco", 1_700_000_000_000, 2)).toBe(`${sku}2`);
  });
});
