import { describe, expect, it } from "vitest";
import { barcodeConflictMessage, firstDuplicateBarcode, normalizeBarcode } from "../src/lib/barcode";
import { cronAuthorized } from "../src/lib/cron-auth";
import {
  normalizePendingOrderHours,
  shouldReleaseUnpaidOrder,
  unpaidOrderCutoff,
} from "../src/lib/pending-orders";
import { cameroonPhoneLookupVariants, phoneLastNine, phonesLikelyMatch } from "../src/lib/phone-match";
import { isAllowedProductImage, isHeicFile, PRODUCT_IMAGE_ACCEPT } from "../src/lib/product-images";
import { isAllowedBulkImage } from "../src/lib/bulk-products";
import { scanMatchDecision } from "../src/lib/pos";
import { buildReceiptText, receiptChangeAmount, saleToReceipt } from "../src/lib/receipt";
import { shopSitemapEntries, SITEMAP_PRODUCT_CAP } from "../src/lib/sitemap-shop";
import { catalogPageMeta, catalogSkip, SHOP_PAGE_SIZE } from "../src/lib/shop-browse";

const shop = {
  name: "NERA Beauté & Shop",
  ticketFooter: "Merci",
};

describe("commandes impayées", () => {
  it("coupe après X heures et ignore 0 (désactivé)", () => {
    expect(normalizePendingOrderHours(undefined)).toBe(24);
    expect(normalizePendingOrderHours(0)).toBe(0);
    expect(normalizePendingOrderHours(48)).toBe(48);
    expect(normalizePendingOrderHours(999)).toBe(168);
    const now = new Date("2026-08-26T12:00:00Z");
    expect(unpaidOrderCutoff(now, 0)).toBeNull();
    expect(unpaidOrderCutoff(now, 24)?.toISOString()).toBe("2026-08-25T12:00:00.000Z");
  });

  it("ne libère que les PENDING sans paiement confirmé", () => {
    const cutoff = new Date("2026-08-25T12:00:00Z");
    expect(
      shouldReleaseUnpaidOrder({
        status: "PENDING",
        createdAt: new Date("2026-08-25T11:00:00Z"),
        cutoff,
        hasCompletedPayment: false,
      }),
    ).toBe(true);
    expect(
      shouldReleaseUnpaidOrder({
        status: "PENDING",
        createdAt: new Date("2026-08-25T11:00:00Z"),
        cutoff,
        hasCompletedPayment: true,
      }),
    ).toBe(false);
    expect(
      shouldReleaseUnpaidOrder({
        status: "CONFIRMED",
        createdAt: new Date("2026-08-24T11:00:00Z"),
        cutoff,
        hasCompletedPayment: false,
      }),
    ).toBe(false);
  });
});

describe("photos HEIC", () => {
  it("accepte HEIC iPhone en plus de jpeg/png/webp/gif", () => {
    expect(PRODUCT_IMAGE_ACCEPT).toMatch(/heic/i);
    expect(isHeicFile({ type: "image/heic", name: "IMG_001.HEIC" })).toBe(true);
    expect(isHeicFile({ type: "", name: "photo.heif" })).toBe(true);
    expect(isAllowedProductImage({ type: "image/heic", name: "a.heic", size: 10 })).toBe(true);
    expect(isAllowedBulkImage({ type: "image/heic", name: "a.heic", size: 10 })).toBe(true);
    expect(isAllowedBulkImage({ type: "video/mp4", name: "a.mp4", size: 10 })).toBe(false);
  });
});

describe("codes-barres uniques", () => {
  it("détecte un doublon dans le formulaire", () => {
    expect(normalizeBarcode(" 611 ")).toBe("611");
    expect(firstDuplicateBarcode(["A", "B", "A"])).toBe("A");
    expect(firstDuplicateBarcode(["A", "", null, "B"])).toBeNull();
    expect(barcodeConflictMessage("611", "Gloss · G1")).toMatch(/611/);
  });

  it("refuse un scan ambigu", () => {
    const list = [
      { sku: "A-1", barcode: "111" },
      { sku: "B-1", barcode: "111" },
    ];
    const decision = scanMatchDecision(list, "111");
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.error).toMatch(/scan ambigu|utilisé par/i);
    expect(scanMatchDecision([{ sku: "A-1", barcode: "111" }], "111").ok).toBe(true);
  });
});

describe("rattachement téléphone", () => {
  it("génère les variantes camerounaises", () => {
    expect(cameroonPhoneLookupVariants("696565654")).toEqual(
      expect.arrayContaining(["696565654", "237696565654", "0696565654"]),
    );
    expect(phoneLastNine("+237 6 96 56 56 54")).toBe("696565654");
    expect(phonesLikelyMatch("0696565654", "237696565654")).toBe(true);
    expect(phonesLikelyMatch("690000000", "691000000")).toBe(false);
  });
});

describe("ticket monnaie", () => {
  it("affiche toujours la monnaie, y compris 0", () => {
    const data = saleToReceipt(
      {
        number: "POS-1",
        createdAt: new Date("2026-08-26T10:00:00Z"),
        subtotal: 10000,
        discount: 0,
        total: 10000,
        items: [{ productName: "Gloss", quantity: 1, unitPrice: 10000, total: 10000 }],
        payments: [{ method: "CASH", amount: 10000 }],
      },
      shop,
    );
    expect(buildReceiptText(data)).toMatch(/Monnaie/);
    data.change = 2000;
    data.cashReceived = 12000;
    const text = buildReceiptText(data);
    expect(text).toMatch(/Monnaie/);
    expect(text).toMatch(/Espèces reçues/);
    expect(receiptChangeAmount(data)).toBe(2000);
  });
});

describe("sitemap et pagination SQL", () => {
  it("liste catégories et produits sous le plafond", () => {
    const entries = shopSitemapEntries({
      base: "https://nerabeaute.cm/",
      categories: [{ slug: "beaute" }],
      products: [{ slug: "serum" }, { slug: "gloss" }],
    });
    expect(entries.some((row) => row.url === "https://nerabeaute.cm/categorie/beaute")).toBe(true);
    expect(entries.some((row) => row.url === "https://nerabeaute.cm/produit/serum")).toBe(true);
    expect(SITEMAP_PRODUCT_CAP).toBe(5000);
  });

  it("calcule skip/take sans tout charger", () => {
    expect(catalogSkip(1)).toBe(0);
    expect(catalogSkip(3, 24)).toBe(48);
    expect(SHOP_PAGE_SIZE).toBe(24);
    expect(catalogPageMeta(50, 3, 24)).toEqual({ total: 50, page: 3, pages: 3, skip: 48, take: 24 });
    expect(catalogPageMeta(10, 9, 24).page).toBe(1);
  });
});

describe("cron", () => {
  it("exige le secret en production", () => {
    const req = new Request("https://x", { headers: { authorization: "Bearer abc" } });
    expect(cronAuthorized(req, { secret: "abc" })).toBe(true);
    expect(cronAuthorized(new Request("https://x"), { secret: "abc" })).toBe(false);
    expect(cronAuthorized(req, { secret: "", nodeEnv: "production" })).toBe(false);
    expect(cronAuthorized(req, { secret: "", nodeEnv: "development" })).toBe(true);
  });
});
