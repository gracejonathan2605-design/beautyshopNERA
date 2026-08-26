import { describe, expect, it } from "vitest";
import { normalizeCartItems } from "../src/lib/cart";
import { normalizeCouponCode } from "../src/lib/coupon";
import { hasEffectivePromo, unitPrice } from "../src/lib/pricing";
import { buildCheckoutPayments, settlePosPayments } from "../src/lib/pos";
import { wrapProductAction } from "../src/lib/product-form-submit";

describe("panier", () => {
  it("fusionne les lignes dupliquées et ignore les quantités invalides", () => {
    expect(
      normalizeCartItems([
        { variantId: "a", quantity: 1.8 },
        { variantId: "a", quantity: 2 },
        { variantId: "b", quantity: 0 },
        { variantId: "", quantity: 3 },
        { variantId: "c", quantity: Number.NaN },
      ]),
    ).toEqual([
      { variantId: "a", quantity: 3 },
    ]);
  });
});

describe("coupon", () => {
  it("normalise les espaces avant publication", () => {
    expect(normalizeCouponCode(" nera10 ")).toBe("NERA10");
    expect(normalizeCouponCode("")).toBeNull();
    expect(normalizeCouponCode("   ")).toBeNull();
  });
});

describe("prix promo boutique", () => {
  it("n’est promo que si le prix barré est vraiment inférieur", () => {
    expect(hasEffectivePromo({ salePrice: 8000, promoPrice: 8000 })).toBe(false);
    expect(hasEffectivePromo({ salePrice: 8000, promoPrice: 0 })).toBe(false);
    expect(hasEffectivePromo({ salePrice: 8000, promoPrice: 5000 })).toBe(true);
    expect(unitPrice({ salePrice: 8000, promoPrice: 8000 })).toBe(8000);
  });
});

describe("caisse paiements", () => {
  it("plafonne le MoMo mixte au reste dû (pas de fausse monnaie)", () => {
    const split = buildCheckoutPayments({
      mixed: true,
      method: "CASH",
      total: 15000,
      cashAmount: 5000,
      momoAmount: 20000,
    });
    expect(split.payments).toEqual([
      { method: "CASH", amount: 5000 },
      { method: "MOBILE_MONEY", amount: 10000 },
    ]);
    expect(split.remaining).toBe(0);
    expect(split.change).toBe(0);
  });

  it("autorise un ticket à 0 FCFA (100 % de remise)", () => {
    expect(settlePosPayments([], 0)).toEqual([]);
    expect(
      buildCheckoutPayments({
        mixed: false,
        method: "CASH",
        total: 0,
        cashAmount: 0,
        momoAmount: null,
      }).remaining,
    ).toBe(0);
  });
});

describe("publication produit", () => {
  it("ne transforme plus une vraie erreur métier en message photo", async () => {
    const wrapped = wrapProductAction(async () => {
      throw new Error("Choisissez une catégorie.");
    });
    const result = await wrapped(null, new FormData());
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Choisissez une catégorie.");
  });
});
