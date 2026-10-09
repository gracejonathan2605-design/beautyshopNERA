/** Même règle que la sortie de stock : une facture qui vide le rayon ouvre une rupture. */
export function stockAlertKind(prevAvailable: number, available: number, minQuantity: number) {
  if (available <= 0 && prevAvailable > 0) return "STOCK_OUT" as const;
  if (available <= minQuantity && prevAvailable > minQuantity) return "STOCK_LOW" as const;
  return null;
}
