import { prisma } from "@/lib/prisma";

export function normalizeBarcode(value: string | null | undefined) {
  const t = value?.trim() ?? "";
  return t ? t : null;
}

export function barcodeConflictMessage(barcode: string, owner?: string) {
  const extra = owner ? ` (${owner})` : "";
  return `Le code-barres « ${barcode} » est déjà utilisé${extra}. Chaque code doit être unique.`;
}

export function firstDuplicateBarcode(barcodes: (string | null | undefined)[]) {
  const seen = new Set<string>();
  for (const raw of barcodes) {
    const code = normalizeBarcode(raw);
    if (!code) continue;
    if (seen.has(code)) return code;
    seen.add(code);
  }
  return null;
}

export async function assertUniqueBarcode(barcode: string | null | undefined, excludeVariantId?: string | null) {
  const code = normalizeBarcode(barcode);
  if (!code) return;
  const existing = await prisma.productVariant.findFirst({
    where: {
      barcode: code,
      deletedAt: null,
      ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
    },
    select: { sku: true, product: { select: { name: true } } },
  });
  if (existing) {
    throw new Error(barcodeConflictMessage(code, `${existing.product.name} · ${existing.sku}`));
  }
}
