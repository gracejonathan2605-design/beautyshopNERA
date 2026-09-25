import type { PartnershipType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { splitPartnerAmounts } from "@/lib/partner-settlement";

const PAID_ORDER_STATUSES = ["CONFIRMED", "PREPARING", "READY", "SHIPPED", "DELIVERED"] as const;

export async function previewBrandSettlement(brandId: string, from: Date, to: Date) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true, partnershipType: true, commissionBps: true },
  });
  if (!brand) throw new Error("Marque introuvable");

  const [orderItems, saleItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        variant: { product: { brandId } },
        order: {
          createdAt: { gte: from, lte: to },
          status: { in: [...PAID_ORDER_STATUSES] },
          payments: { some: { status: "COMPLETED" } },
        },
      },
      select: {
        quantity: true,
        total: true,
        productName: true,
        sku: true,
        variant: { select: { costPrice: true } },
      },
    }),
    prisma.saleItem.findMany({
      where: {
        variant: { product: { brandId } },
        sale: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
      },
      select: {
        quantity: true,
        total: true,
        productName: true,
        sku: true,
        variant: { select: { costPrice: true } },
      },
    }),
  ]);

  const lines = [...orderItems, ...saleItems].map((row) => ({
    productName: row.productName,
    sku: row.sku,
    quantity: row.quantity,
    revenue: row.total,
    cost: row.variant.costPrice * row.quantity,
  }));
  const totals = splitPartnerAmounts({
    partnershipType: brand.partnershipType,
    commissionBps: brand.commissionBps,
    lines,
  });
  return { brand, lines, ...totals };
}

export async function saveBrandSettlement(input: {
  brandId: string;
  from: Date;
  to: Date;
  partnershipType: PartnershipType;
  commissionBps: number;
}) {
  const preview = await previewBrandSettlement(input.brandId, input.from, input.to);
  return prisma.brandSettlement.create({
    data: {
      brandId: input.brandId,
      periodFrom: input.from,
      periodTo: input.to,
      gross: preview.gross,
      cost: preview.cost,
      neraShare: preview.neraShare,
      brandShare: preview.brandShare,
    },
  });
}
