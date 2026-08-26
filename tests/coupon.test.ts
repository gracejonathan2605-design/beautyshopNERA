import { describe, expect, it } from "vitest";
import { couponDiscountAmount, couponLabel, explainCouponFailure, normalizeCouponCode } from "../src/lib/coupon";
import type { Coupon } from "@prisma/client";

function coupon(partial: Partial<Coupon>): Coupon {
  return {
    id: "c1",
    code: "NERA10",
    type: "PERCENT",
    value: 10,
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
  it("applique 10 % au-dessus du minimum NERA10", () => {
    expect(couponDiscountAmount("PERCENT", 10, 20000)).toBe(2000);
    expect(couponDiscountAmount("PERCENT", 10, 19999)).toBe(2000);
    expect(explainCouponFailure(coupon({}), 19999)).toContain("20");
    expect(explainCouponFailure(coupon({}), 20000)).toBeNull();
    expect(couponLabel("PERCENT", 10)).toBe("−10 %");
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
