import { describe, expect, it } from "vitest";
import { couponDiscountAmount, couponLabel, explainCouponFailure, normalizeCouponCode } from "../src/lib/coupon";
import { NERA10_OFFER } from "../src/lib/coupon-offer";
import { formatCfa } from "../src/lib/money";
import type { Coupon } from "@prisma/client";

function coupon(partial: Partial<Coupon>): Coupon {
  return {
    id: "c1",
    code: "NERA10",
    type: NERA10_OFFER.type,
    value: NERA10_OFFER.amount,
    startAt: null,
    endAt: null,
    maxUses: 100,
    usedCount: 0,
    minAmount: 20000,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    ...partial,
  };
}

describe("codes promo", () => {
  it("retire 1 000 FCFA dès 20 000 FCFA avec NERA10", () => {
    expect(NERA10_OFFER.amount).toBe(1000);
    expect(NERA10_OFFER.type).toBe("FIXED");
    expect(couponDiscountAmount(NERA10_OFFER.type, NERA10_OFFER.amount, 20000)).toBe(1000);
    expect(couponDiscountAmount(NERA10_OFFER.type, NERA10_OFFER.amount, 125000)).toBe(1000);
    expect(explainCouponFailure(coupon({}), 19999)).toContain("20");
    expect(explainCouponFailure(coupon({}), 20000)).toBeNull();
    expect(couponLabel(NERA10_OFFER.type, NERA10_OFFER.amount)).toBe(`−${formatCfa(NERA10_OFFER.amount)}`);
  });

  it("plafonne une remise fixe au sous-total", () => {
    expect(couponDiscountAmount("FIXED", 5000, 3000)).toBe(3000);
    expect(couponDiscountAmount("FIXED", 5000, 12000)).toBe(5000);
  });

  it("refuse un code inactif ou épuisé", () => {
    expect(explainCouponFailure(null, 25000)).toContain("n’existe pas");
    expect(explainCouponFailure(coupon({ isActive: false }), 25000)).toContain("plus actif");
    expect(explainCouponFailure(coupon({ maxUses: 1, usedCount: 1 }), 25000)).toContain("limite");
    expect(normalizeCouponCode(" nera10 ")).toBe("NERA10");
  });
});
