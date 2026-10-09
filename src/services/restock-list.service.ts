import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unitPrice } from "@/lib/pricing";
import {
  restockWeekStart,
  sortRestockLines,
  toRestockLine,
  type RestockLine,
  type RestockSource,
} from "@/lib/restock-list";

export async function loadRestockList(now = new Date()): Promise<RestockLine[]> {
  const since = restockWeekStart(now);
  const inventories = await prisma.inventory.findMany({
    where: {
      variant: {
        deletedAt: null,
        product: { deletedAt: null, status: { not: "ARCHIVED" } },
      },
    },
    select: {
      id: true,
      onHand: true,
      reserved: true,
      minQuantity: true,
      location: { select: { name: true } },
      variant: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          costPrice: true,
          salePrice: true,
          promoPrice: true,
          product: {
            select: {
              name: true,
              category: { select: { name: true } },
              supplier: { select: { name: true, phone: true } },
            },
          },
        },
      },
    },
  });

  const watched = inventories.filter(
    (row) => row.onHand - row.reserved <= row.minQuantity,
  );
  const variantIds = [...new Set(watched.map((row) => row.variant.id))];
  if (!variantIds.length) return [];

  const ids = Prisma.join(variantIds);
  const [sales, movements, purchases] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["variantId"],
      where: {
        variantId: { in: variantIds },
        createdAt: { gte: since },
        type: { in: ["SALE_POS", "SALE_ONLINE"] },
        quantity: { lt: 0 },
      },
      _sum: { quantity: true },
    }),
    prisma.$queryRaw<Array<{ variantId: string; createdAt: Date; type: string }>>`
      SELECT DISTINCT ON ("variantId") "variantId", "createdAt", "type"::text AS "type"
      FROM "StockMovement"
      WHERE "variantId" IN (${ids})
      ORDER BY "variantId", "createdAt" DESC
    `,
    prisma.$queryRaw<Array<{ variantId: string; name: string | null; phone: string | null }>>`
      SELECT DISTINCT ON (m."variantId") m."variantId", s."name", s."phone"
      FROM "StockMovement" m
      LEFT JOIN "Supplier" s ON s."id" = m."supplierId"
      WHERE m."type"::text = 'PURCHASE' AND m."variantId" IN (${ids})
      ORDER BY m."variantId", m."createdAt" DESC
    `,
  ]);

  const soldByVariant = new Map(sales.map((row) => [row.variantId, Math.abs(row._sum.quantity ?? 0)]));
  const lastMove = new Map(movements.map((row) => [row.variantId, row]));
  const lastPurchase = new Map(purchases.map((row) => [row.variantId, row]));

  const lines = watched.flatMap((row) => {
    const purchase = lastPurchase.get(row.variant.id);
    const move = lastMove.get(row.variant.id);
    const source: RestockSource = {
      inventoryId: row.id,
      variantId: row.variant.id,
      productName: row.variant.product.name,
      variantName: row.variant.name,
      sku: row.variant.sku,
      barcode: row.variant.barcode,
      category: row.variant.product.category?.name ?? null,
      location: row.location.name,
      onHand: row.onHand,
      reserved: row.reserved,
      minQuantity: row.minQuantity,
      costPrice: row.variant.costPrice,
      salePrice: unitPrice(row.variant),
      supplierName: row.variant.product.supplier?.name ?? purchase?.name ?? null,
      supplierPhone: row.variant.product.supplier?.phone ?? purchase?.phone ?? null,
      soldThisWeek: soldByVariant.get(row.variant.id) ?? 0,
      lastMovementAt: move?.createdAt ?? null,
      lastMovementType: move?.type ?? null,
    };
    const line = toRestockLine(source);
    return line ? [line] : [];
  });

  return sortRestockLines(lines);
}
