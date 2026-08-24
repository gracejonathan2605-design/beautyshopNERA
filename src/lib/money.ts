const formatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

export function formatCfa(amount: number) {
  return `${formatter.format(Math.round(amount))} FCFA`;
}

export function parseCfaInput(value: string) {
  const cleaned = value.replace(/\s/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function marginAmount(salePrice: number, costPrice: number) {
  return salePrice - costPrice;
}

export function marginRate(salePrice: number, costPrice: number) {
  if (salePrice <= 0) return 0;
  return Math.round(((salePrice - costPrice) / salePrice) * 100);
}
