import { describe, expect, it } from "vitest";
import { cartCanCheckout, checkoutLinesFromCart } from "../src/lib/cart";
import { couponClaimFilter } from "../src/lib/coupon";
import { cronAuthorized } from "../src/lib/cron-auth";
import { parseCfaInput } from "../src/lib/money";
import { stockEffectForTransition } from "../src/lib/order-flow";
import { isValidSaleQuantity } from "../src/lib/pos";
import { phoneLastNine, phonesLikelyMatch } from "../src/lib/phone-match";

describe("saisie FCFA", () => {
  it("lit les milliers à la française (10.000 = dix mille)", () => {
    expect(parseCfaInput("10.000")).toBe(10000);
    expect(parseCfaInput("10 000")).toBe(10000);
    expect(parseCfaInput("10,000")).toBe(10000);
    expect(parseCfaInput("10000")).toBe(10000);
    expect(parseCfaInput("0")).toBe(0);
    expect(parseCfaInput("")).toBe(0);
  });
});

describe("panier checkout", () => {
  it("refuse un mixte avec une ligne en rupture", () => {
    expect(cartCanCheckout([{ available: 3, quantity: 1 }, { available: 0, quantity: 1 }])).toBe(false);
    expect(cartCanCheckout([{ available: 3, quantity: 1 }])).toBe(true);
    expect(cartCanCheckout([{ available: 2, quantity: 3 }])).toBe(false);
  });

  it("refuse de commander si le cookie contient encore un article disparu", () => {
    expect(cartCanCheckout([{ available: 3, quantity: 1 }], 2)).toBe(false);
    expect(cartCanCheckout([{ available: 3, quantity: 1 }], 1)).toBe(true);
  });

  it("détecte un article disparu ou un stock trop bas", () => {
    const available = new Map([
      ["a", 2],
      ["b", 1],
    ]);
    expect(checkoutLinesFromCart([{ variantId: "a", quantity: 1 }], available).ok).toBe(true);
    expect(checkoutLinesFromCart([{ variantId: "gone", quantity: 1 }], available).ok).toBe(false);
    expect(checkoutLinesFromCart([{ variantId: "a", quantity: 9 }], available).ok).toBe(false);
  });
});

describe("coupon claim", () => {
  it("exige un coupon encore actif et dans les dates", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const filter = couponClaimFilter({ id: "c1", maxUses: 10 }, now);
    expect(filter.isActive).toBe(true);
    expect(filter.id).toBe("c1");
    expect(filter.usedCount).toEqual({ lt: 10 });
    expect(couponClaimFilter({ id: "c2", maxUses: null }, now).usedCount).toBeUndefined();
  });
});

describe("quantité caisse", () => {
  it("refuse les fractions et le zéro", () => {
    expect(isValidSaleQuantity(1)).toBe(true);
    expect(isValidSaleQuantity(1.5)).toBe(false);
    expect(isValidSaleQuantity(0)).toBe(false);
    expect(isValidSaleQuantity(Infinity)).toBe(false);
  });
});

describe("commande en ligne — stock client", () => {
  it("retranche totalSpent seulement après expédition (restock), pas à l’annulation avant envoi", () => {
    expect(stockEffectForTransition("READY", "CANCELLED")).toBe("release");
    expect(stockEffectForTransition("SHIPPED", "REFUNDED")).toBe("restock");
    expect(stockEffectForTransition("DELIVERED", "REFUNDED")).toBe("restock");
  });
});

describe("cron", () => {
  it("accepte le Bearer même si la comparaison est timing-safe", () => {
    const req = new Request("https://x", { headers: { authorization: "Bearer abc" } });
    expect(cronAuthorized(req, { secret: "abc" })).toBe(true);
    expect(cronAuthorized(req, { secret: "abcd" })).toBe(false);
  });
});

describe("téléphone suffixe", () => {
  it("ne confond plus un 9 avec un numéro qui le contient au milieu", () => {
    expect(phoneLastNine("696565654")).toBe("696565654");
    expect(phoneLastNine("69656565499")?.endsWith("6565499")).toBe(true);
    expect(phoneLastNine("69656565499")).not.toBe("696565654");
  });

  it("traite 690000000 et 237690000000 comme le même numéro", () => {
    expect(phonesLikelyMatch("690000000", "237690000000")).toBe(true);
    expect(phonesLikelyMatch("690000000", "0690000000")).toBe(true);
    expect(phonesLikelyMatch("690000000", "691000000")).toBe(false);
  });
});
