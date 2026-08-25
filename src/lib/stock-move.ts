import type { StockMovementType } from "@prisma/client";

export const STOCK_MOVE_REASONS = [
  { type: "LOSS" as const, label: "Perte", hint: "Sortie de stock (casse, péremption…)" },
  { type: "DONATION" as const, label: "Don", hint: "Sortie offerte, hors vente" },
  { type: "RETURN" as const, label: "Retour", hint: "Retour en rayon (entrée)" },
  { type: "ADJUSTMENT" as const, label: "Ajustement", hint: "Correction d’inventaire (+/−)" },
] as const;

export type StockMoveReason = (typeof STOCK_MOVE_REASONS)[number]["type"];

export function isStockMoveReason(value: string): value is StockMoveReason {
  return STOCK_MOVE_REASONS.some((reason) => reason.type === value);
}

export function quantityForStockReason(type: StockMoveReason, rawQty: number) {
  if (!Number.isFinite(rawQty) || rawQty === 0) throw new Error("Quantité nulle");
  const qty = Math.trunc(rawQty);
  if (qty === 0) throw new Error("Quantité nulle");
  if (type === "LOSS" || type === "DONATION") return -Math.abs(qty);
  if (type === "RETURN") return Math.abs(qty);
  return qty;
}

export function defaultStockMoveComment(type: StockMoveReason) {
  if (type === "LOSS") return "Perte";
  if (type === "DONATION") return "Don";
  if (type === "RETURN") return "Retour en stock";
  return "Ajustement manuel";
}

export type AdjustableStockType = Extract<StockMovementType, StockMoveReason>;
