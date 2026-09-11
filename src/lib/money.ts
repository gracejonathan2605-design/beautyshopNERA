const formatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

export function formatCfa(amount: number) {
  return `${formatter.format(Math.round(amount))} FCFA`;
}

/** FCFA n’a pas de sous-unité : espaces, points et virgules sont des séparateurs de milliers (ex. 10.000). */
export function parseCfaInput(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.startsWith("-")) return 0;
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
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
