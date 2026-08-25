export function unitPrice(variant: { salePrice: number; promoPrice: number | null }) {
  const promo = variant.promoPrice;
  if (promo != null && promo > 0 && promo < variant.salePrice) return promo;
  return variant.salePrice;
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
