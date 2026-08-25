import { unitPrice } from "@/lib/pricing";

export type StockInventory = { onHand: number; reserved: number };

export function availableQty(onHand: number, reserved: number) {
  return onHand - reserved;
}

export function variantAvailable(inventories: StockInventory[] | undefined) {
  if (!inventories?.length) return 0;
  return inventories.reduce((sum, row) => sum + availableQty(row.onHand, row.reserved), 0);
}

export function productInStock(
  variants: { inventories?: StockInventory[] }[] | undefined,
) {
  if (!variants?.length) return false;
  return variants.some((variant) => variantAvailable(variant.inventories) > 0);
}

export function displayVariant<
  T extends { inventories?: StockInventory[]; salePrice: number; promoPrice: number | null },
>(variants: T[]): T | undefined {
  return variants.find((variant) => variantAvailable(variant.inventories) > 0) ?? variants[0];
}

export function displayUnitPrice(
  variants: { salePrice: number; promoPrice: number | null; inventories?: StockInventory[] }[],
) {
  const variant = displayVariant(variants);
  return variant ? unitPrice(variant) : 0;
}
