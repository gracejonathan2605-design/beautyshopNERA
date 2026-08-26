export function unitPrice(variant: { salePrice: number; promoPrice: number | null }) {
  const promo = variant.promoPrice;
  if (promo != null && promo > 0 && promo < variant.salePrice) return promo;
  return variant.salePrice;
}

export function hasEffectivePromo(variant: { salePrice: number; promoPrice: number | null }) {
  return unitPrice(variant) < variant.salePrice;
}

export function promoPercent(salePrice: number, promoPrice: number | null) {
  if (promoPrice == null || promoPrice <= 0 || promoPrice >= salePrice) return 0;
  return Math.round(((salePrice - promoPrice) / salePrice) * 100);
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
