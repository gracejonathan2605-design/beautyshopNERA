import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStockChange } from "@/services/inventory.service";
import { formatRef, nextSequence } from "@/lib/sequences";
import { getShopSettings } from "@/lib/settings";
import { writeAudit } from "@/lib/audit";
import { unitPrice as priced } from "@/lib/pricing";
import { clampDiscount, isValidSaleQuantity, settlePosPayments, ticketTotals } from "@/lib/pos";
import { cashReturnTillExpenseAmount } from "@/lib/till";
import { lockCashSessionRow, lockOpenCashSession, resolveTillExpenseCategoryId } from "@/services/cash.service";

export type SaleLineInput = {
  variantId: string;
  quantity: number;
  discount?: number;
};

export async function createPosSale(input: {
  cashierId: string;
  locationId: string;
  cashSessionId?: string | null;
  customerId?: string | null;
  discount?: number;
  notes?: string;
  heldTicketId?: string | null;
  lines: SaleLineInput[];
  payments: { method: PaymentMethod; amount: number; reference?: string }[];
}) {
  if (!input.lines.length) throw new Error("Le panier est vide");

  const result = await prisma.$transaction(async (tx) => {
    const settings = await getShopSettings(tx);
    const seq = await nextSequence(tx, "sale");
    const number = formatRef(settings.prefixes.sale, seq.year, seq.value);

    const variants = await tx.productVariant.findMany({
      where: { id: { in: input.lines.map((l) => l.variantId) }, deletedAt: null, isActive: true },
      include: { product: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    const pricedLines: { variantId: string; quantity: number; unitPrice: number; discount: number; productName: string; variantName: string; sku: string }[] = [];

    for (const line of input.lines) {
      const variant = byId.get(line.variantId);
      if (!variant) throw new Error("Variante introuvable ou inactive");
      if (!isValidSaleQuantity(line.quantity)) throw new Error("Quantité invalide");
      const unitPrice = priced(variant);
      const gross = unitPrice * line.quantity;
      const discount = clampDiscount(line.discount ?? 0, gross);
      pricedLines.push({
        variantId: variant.id,
        quantity: line.quantity,
        unitPrice,
        discount,
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
      });
    }

    const totals = ticketTotals(
      pricedLines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity, discount: line.discount })),
      input.discount ?? 0,
    );
    const items: Prisma.SaleItemUncheckedCreateWithoutSaleInput[] = pricedLines.map((line) => ({
      variantId: line.variantId,
      productName: line.productName,
      variantName: line.variantName,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      total: line.unitPrice * line.quantity - line.discount,
    }));

    const subtotal = totals.subtotal;
    const cartDiscount = totals.cartDiscount;
    const total = totals.total;
    const payments = settlePosPayments(input.payments, total);

    if (input.cashSessionId) {
      await lockOpenCashSession(
        tx,
        input.cashSessionId,
        "La caisse n’est plus ouverte. Rouvrez-la avant d’encaisser.",
      );
    }

    if (input.heldTicketId) {
      const consumed = await tx.heldTicket.deleteMany({
        where: { id: input.heldTicketId, cashierId: input.cashierId },
      });
      if (consumed.count !== 1) {
        throw new Error("Ce ticket en attente a déjà été encaissé ou retiré.");
      }
    }

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
          create: payments.map((p) => ({
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


async function recordCashReturnTillExpense(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    saleNumber: string;
    cashSessionId: string | null;
    payments: { method: string; status: string; amount: number }[];
    kind: "refund" | "cancel";
  },
) {
  const cashPortion = input.payments
    .filter((p) => p.method === "CASH" && p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

  let originalStatus: string | null = null;
  if (input.cashSessionId) {
    const session = await tx.cashSession.findUnique({
      where: { id: input.cashSessionId },
      select: { status: true },
    });
    originalStatus = session?.status ?? null;
  }

  const expenseAmount = cashReturnTillExpenseAmount(cashPortion, originalStatus);
  if (expenseAmount <= 0) return;

  const found = await tx.cashSession.findFirst({
    where: { status: "OPEN", openedById: input.userId },
    select: { id: true },
  });
  if (!found) {
    throw new Error(
      input.kind === "refund"
        ? `Ouvrez la caisse pour rembourser ${expenseAmount} FCFA en espèces.`
        : `Ouvrez la caisse pour annuler une vente de ${expenseAmount} FCFA en espèces.`,
    );
  }
  const open = await lockOpenCashSession(
    tx,
    found.id,
    input.kind === "refund"
      ? `Ouvrez la caisse pour rembourser ${expenseAmount} FCFA en espèces.`
      : `Ouvrez la caisse pour annuler une vente de ${expenseAmount} FCFA en espèces.`,
  );

  const categoryId = await resolveTillExpenseCategoryId(tx);
  await tx.expense.create({
    data: {
      categoryId,
      amount: expenseAmount,
      date: new Date(),
      description:
        input.kind === "refund"
          ? `Remboursement ${input.saleNumber}`
          : `Annulation ${input.saleNumber}`,
      userId: input.userId,
      cashSessionId: open.id,
    },
  });
}

export async function cancelSale(input: { saleId: string; userId: string; restock: boolean }) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: input.saleId },
      include: { items: true, payments: true },
    });
    if (!sale) throw new Error("Vente introuvable");
    if (sale.cashSessionId) {
      await lockCashSessionRow(tx, sale.cashSessionId);
    }

    const claimed = await tx.sale.updateMany({
      where: { id: sale.id, status: "COMPLETED" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) throw new Error("Cette vente ne peut plus être annulée");
    await tx.payment.updateMany({
      where: { saleId: sale.id },
      data: { status: "REFUNDED" },
    });

    await recordCashReturnTillExpense(tx, {
      userId: input.userId,
      saleNumber: sale.number,
      cashSessionId: sale.cashSessionId,
      payments: sale.payments,
      kind: "cancel",
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

export async function refundSale(input: { saleId: string; userId: string; restock?: boolean }) {
  const restock = input.restock !== false;
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: input.saleId },
      include: { items: true, payments: true },
    });
    if (!sale) throw new Error("Vente introuvable");
    if (sale.cashSessionId) {
      await lockCashSessionRow(tx, sale.cashSessionId);
    }

    const claimed = await tx.sale.updateMany({
      where: { id: sale.id, status: "COMPLETED" },
      data: { status: "REFUNDED" },
    });
    if (claimed.count !== 1) throw new Error("Cette vente ne peut plus être remboursée");
    await tx.payment.updateMany({
      where: { saleId: sale.id },
      data: { status: "REFUNDED" },
    });

    await recordCashReturnTillExpense(tx, {
      userId: input.userId,
      saleNumber: sale.number,
      cashSessionId: sale.cashSessionId,
      payments: sale.payments,
      kind: "refund",
    });

    if (restock) {
      for (const item of sale.items) {
        await applyStockChange(tx, {
          variantId: item.variantId,
          locationId: sale.locationId,
          type: "RETURN",
          quantity: item.quantity,
          userId: input.userId,
          reference: sale.number,
          comment: "Retour / remboursement caisse",
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
        action: "SALE_REFUND",
        entity: "Sale",
        entityId: sale.id,
        before: { status: "COMPLETED", total: sale.total },
        after: { status: "REFUNDED", restock },
      },
    });

    return sale;
  });
}
