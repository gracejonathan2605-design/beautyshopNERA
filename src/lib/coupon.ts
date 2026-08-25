import type { Coupon, PromotionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";

export function couponDiscountAmount(type: PromotionType, value: number, subtotal: number) {
  if (subtotal <= 0 || value <= 0) return 0;
  if (type === "PERCENT") return Math.min(subtotal, Math.round((subtotal * Math.min(value, 100)) / 100));
  return Math.min(subtotal, value);
}

export function explainCouponFailure(coupon: Coupon | null, subtotal: number, now = new Date()) {
  if (!coupon) return "Ce code promo n’existe pas.";
  if (!coupon.isActive) return "Ce code promo n’est plus actif.";
  if (coupon.startAt && coupon.startAt > now) return "Ce code promo n’est pas encore valable.";
  if (coupon.endAt && coupon.endAt < now) return "Ce code promo a expiré.";
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return "Ce code promo a atteint sa limite d’utilisation.";
  }
  if (subtotal < coupon.minAmount) {
    return `Minimum d’achat : ${formatCfa(coupon.minAmount)}.`;
  }
  return null;
}

export function couponLabel(type: PromotionType, value: number) {
  return type === "PERCENT" ? `−${value} %` : `−${formatCfa(value)}`;
}

export async function quoteCoupon(code: string, subtotal: number) {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { ok: false as const, discount: 0, error: "Indiquez un code promo." };
  }
  const coupon = await prisma.coupon.findUnique({ where: { code: trimmed } });
  const error = explainCouponFailure(coupon, subtotal);
  if (error || !coupon) {
    return { ok: false as const, discount: 0, error: error ?? "Coupon invalide" };
  }
  return {
    ok: true as const,
    discount: couponDiscountAmount(coupon.type, coupon.value, subtotal),
    label: couponLabel(coupon.type, coupon.value),
    code: coupon.code,
  };
}
