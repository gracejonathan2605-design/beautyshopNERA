import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStockChange } from "@/services/inventory.service";
import { formatRef, nextSequence } from "@/lib/sequences";
import { getShopSettings } from "@/lib/settings";
import { writeAudit } from "@/lib/audit";

export type SaleLineInput = {
  variantId: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
};

export async function createPosSale(input: {
  cashierId: string;
  locationId: string;
  cashSessionId?: string | null;
  customerId?: string | null;
  discount?: number;
  notes?: string;
  lines: SaleLineInput[];
  payments: { method: PaymentMethod; amount: number; reference?: string }[];
}) {
  if (!input.lines.length) throw new Error("Le panier est vide");
  const paymentTotal = input.payments.reduce((s, p) => s + p.amount, 0);

  const result = await prisma.$transaction(async (tx) => {
    const settings = await getShopSettings();
    const seq = await nextSequence(tx, "sale");
    const number = formatRef(settings.prefixes.sale, seq.year, seq.value);

    const variants = await tx.productVariant.findMany({
      where: { id: { in: input.lines.map((l) => l.variantId) }, deletedAt: null, isActive: true },
      include: { product: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    const items: Prisma.SaleItemUncheckedCreateWithoutSaleInput[] = [];

    for (const line of input.lines) {
      const variant = byId.get(line.variantId);
      if (!variant) throw new Error("Variante introuvable ou inactive");
      if (line.quantity <= 0) throw new Error("Quantité invalide");
      const unitPrice = line.unitPrice ?? variant.promoPrice ?? variant.salePrice;
      const discount = line.discount ?? 0;
      const total = unitPrice * line.quantity - discount;
      if (total < 0) throw new Error("Ligne au montant invalide");
      subtotal += unitPrice * line.quantity;
      items.push({
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: line.quantity,
        unitPrice,
        discount,
        total,
      });
    }

    const cartDiscount = input.discount ?? 0;
    const total = subtotal - cartDiscount - items.reduce((s, i) => s + (i.discount as number), 0);
    if (total < 0) throw new Error("Total invalide");
    if (paymentTotal < total) throw new Error("Paiement insuffisant");

    const sale = await tx.sale.create({
      data: {
        number,
        customerId: input.customerId ?? undefined,
        cashierId: input.cashierId,
        cashSessionId: input.cashSessionId ?? undefined,
        locationId: input.locationId,
        subtotal,
        discount: cartDiscount,
        total,
        notes: input.notes,
        items: { create: items },
        payments: {
          create: input.payments.map((p) => ({
            amount: p.amount,
            method: p.method,
            reference: p.reference,
            status: "COMPLETED",
          })),
        },
      },
      include: { items: true, payments: true, cashier: true, customer: true },
    });

    for (const line of input.lines) {
      await applyStockChange(tx, {
        variantId: line.variantId,
        locationId: input.locationId,
        type: "SALE_POS",
        quantity: -line.quantity,
        userId: input.cashierId,
        reference: sale.number,
        comment: "Vente caisse",
      });
    }

    if (input.customerId) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: {
          totalSpent: { increment: total },
          lastPurchaseAt: new Date(),
        },
      });
    }

    return sale;
  });

  await writeAudit({
    userId: input.cashierId,
    action: "SALE_CREATE",
    entity: "Sale",
    entityId: result.id,
    after: { number: result.number, total: result.total },
  });

  return result;
}

export async function cancelSale(input: { saleId: string; userId: string; restock: boolean }) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: input.saleId },
      include: { items: true, payments: true },
    });
    if (!sale) throw new Error("Vente introuvable");
    if (sale.status !== "COMPLETED") throw new Error("Cette vente ne peut plus être annulée");

    await tx.sale.update({
      where: { id: sale.id },
      data: { status: "CANCELLED" },
    });
    await tx.payment.updateMany({
      where: { saleId: sale.id },
      data: { status: "REFUNDED" },
    });

    if (input.restock) {
      for (const item of sale.items) {
        await applyStockChange(tx, {
          variantId: item.variantId,
          locationId: sale.locationId,
          type: "CANCELLATION",
          quantity: item.quantity,
          userId: input.userId,
          reference: sale.number,
          comment: "Annulation vente POS",
        });
      }
    }

    if (sale.customerId) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { totalSpent: { decrement: sale.total } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "SALE_CANCEL",
        entity: "Sale",
        entityId: sale.id,
        before: { status: "COMPLETED", total: sale.total },
        after: { status: "CANCELLED", restock: input.restock },
      },
    });

    return sale;
  });
}
