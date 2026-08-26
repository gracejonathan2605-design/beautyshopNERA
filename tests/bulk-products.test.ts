import { describe, expect, it } from "vitest";
import { fillBulkProductFormData } from "../src/lib/bulk-form";
import {
  bulkDraftIssues,
  bulkImageRejection,
  isAllowedBulkImage,
  MAX_BULK_PRODUCTS,
  MAX_BULK_SOURCE_BYTES,
  suggestNameFromFile,
} from "../src/lib/bulk-products";

describe("bulk product drafts", () => {
  it("accepte 15 photos max par lot", () => {
    expect(MAX_BULK_PRODUCTS).toBe(15);
    expect(MAX_BULK_SOURCE_BYTES).toBe(20 * 1024 * 1024);
  });

  it("valide jpeg/png/webp/gif et refuse le reste", () => {
    expect(isAllowedBulkImage({ type: "image/jpeg", name: "a.jpg", size: 10 })).toBe(true);
    expect(isAllowedBulkImage({ type: "image/png", name: "a.png", size: 10 })).toBe(true);
    expect(isAllowedBulkImage({ type: "image/webp", name: "a.webp", size: 10 })).toBe(true);
    expect(isAllowedBulkImage({ type: "image/gif", name: "a.gif", size: 10 })).toBe(true);
    expect(isAllowedBulkImage({ type: "image/heic", name: "a.heic", size: 10 })).toBe(true);
    expect(isAllowedBulkImage({ type: "video/mp4", name: "a.mp4", size: 10 })).toBe(false);
    expect(isAllowedBulkImage({ type: "image/jpeg", name: "a.jpg", size: 0 })).toBe(false);
  });

  it("refuse une photo trop lourde avant compression", () => {
    expect(
      bulkImageRejection({ type: "image/jpeg", name: "a.jpg", size: MAX_BULK_SOURCE_BYTES + 1 }),
    ).toMatch(/20 Mo/);
    expect(bulkImageRejection({ type: "image/jpeg", name: "a.jpg", size: 1200 })).toBeNull();
  });

  it("propose un nom à partir du fichier", () => {
    expect(suggestNameFromFile("serum-vitamine-c.jpg")).toBe("Serum vitamine c");
    expect(suggestNameFromFile("huile_argan.png")).toBe("Huile argan");
  });

  it("signale nom, rayon et prix manquants", () => {
    expect(bulkDraftIssues({ name: "", categoryId: "", salePrice: "" })).toEqual([
      "Nom manquant",
      "Catégorie manquante",
      "Prix manquant",
    ]);
    expect(bulkDraftIssues({ name: "Sérum", categoryId: "cat_1", salePrice: "8500" })).toEqual([]);
    expect(bulkDraftIssues({ name: "Sérum", categoryId: "cat_1", salePrice: "0" })).toEqual([
      "Prix manquant",
    ]);
  });

  it("remplit le FormData attendu par saveProduct", () => {
    const fd = new FormData();
    fillBulkProductFormData(fd, {
      name: "Sérum C",
      shortDescription: "Éclat",
      description: "Soin",
      categoryId: "cat_abc",
      brandId: "br_1",
      supplierId: "",
      sku: "SKU-1",
      salePrice: "8500",
      promoPrice: "7000",
      costPrice: "3000",
      barcode: "123",
      stock: "4",
      isFeatured: true,
      isPromo: false,
      isNew: true,
      onlineVisible: true,
    });
    expect(fd.get("name")).toBe("Sérum C");
    expect(fd.get("categoryId")).toBe("cat_abc");
    expect(fd.get("brandId")).toBe("br_1");
    expect(fd.get("sku")).toBe("SKU-1");
    expect(fd.get("variantName")).toBe("Standard");
    expect(fd.get("variantSalePrice")).toBe("8500");
    expect(fd.get("variantPromoPrice")).toBe("7000");
    expect(fd.get("variantCostPrice")).toBe("3000");
    expect(fd.get("variantBarcode")).toBe("123");
    expect(fd.get("variantStock")).toBe("4");
    expect(fd.get("isFeatured")).toBe("on");
    expect(fd.get("isPromo")).toBe("on");
    expect(fd.get("onlineVisible")).toBe("on");
    expect(fd.get("isNew")).toBe("on");
  });
});
