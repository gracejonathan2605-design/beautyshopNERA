import type { PaymentMethod } from "@prisma/client";

export type PosVariant = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  promoPrice: number | null;
  product: { name: string; images?: { url: string }[] };
  inventories: { onHand: number; reserved: number }[];
};

export type PosLineCalc = {
  unitPrice: number;
  quantity: number;
  discount: number;
};

export type HeldTicketPayload = {
  lines: { variant: PosVariant; quantity: number; discount: number }[];
  ticketDiscount: number;
  customerId?: string;
  customerPhone: string;
  customerName: string;
  mixed: boolean;
  method: PaymentMethod;
};

export function clampDiscount(amount: number, max: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(Math.round(amount), Math.max(0, Math.round(max)));
}

export function ticketTotals(lines: PosLineCalc[], ticketDiscount = 0) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const lineDiscounts = lines.reduce(
    (sum, line) => sum + clampDiscount(line.discount, line.unitPrice * line.quantity),
    0,
  );
  const afterLines = subtotal - lineDiscounts;
  const cartDiscount = clampDiscount(ticketDiscount, afterLines);
  return {
    subtotal,
    lineDiscounts,
    cartDiscount,
    discountTotal: lineDiscounts + cartDiscount,
    total: afterLines - cartDiscount,
  };
}

export function pickExactScanMatch<T extends { sku: string; barcode: string | null }>(
  list: T[],
  code: string,
): T | null {
  const needle = code.trim();
  if (!needle) return null;
  const lower = needle.toLowerCase();
  return (
    list.find((item) => item.barcode === needle || item.sku.toLowerCase() === lower) ?? null
  );
}

export function settlePosPayments(
  payments: { method: PaymentMethod; amount: number; reference?: string }[],
  total: number,
) {
  const due = Math.max(0, Math.round(total));
  if (due <= 0) return [];
  if (!payments.length) throw new Error("Indiquez un paiement");
  for (const payment of payments) {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      throw new Error("Montant de paiement invalide");
    }
  }
  const other = payments.filter((p) => p.method !== "CASH");
  const cash = payments.filter((p) => p.method === "CASH");
  const otherTotal = other.reduce((sum, p) => sum + p.amount, 0);
  if (otherTotal > due) throw new Error("Paiement supérieur au total");
  const cashNeeded = due - otherTotal;
  const cashTendered = cash.reduce((sum, p) => sum + p.amount, 0);
  if (cashTendered < cashNeeded) throw new Error("Paiement insuffisant");
  const recorded: { method: PaymentMethod; amount: number; reference?: string }[] = other.map((p) => ({
    method: p.method,
    amount: Math.round(p.amount),
    reference: p.reference,
  }));
  if (cashNeeded > 0) {
    recorded.push({
      method: "CASH",
      amount: cashNeeded,
      reference: cash[0]?.reference,
    });
  }
  return recorded;
}

export function buildCheckoutPayments(input: {
  mixed: boolean;
  method: PaymentMethod;
  total: number;
  cashAmount: number;
  momoAmount: number | null;
}): { payments: { method: PaymentMethod; amount: number }[]; change: number; remaining: number } {
  const total = Math.max(0, Math.round(input.total));
  if (!input.mixed) {
    if (input.method === "CASH") {
      const tendered = input.cashAmount > 0 ? Math.round(input.cashAmount) : total;
      return {
        payments: tendered > 0 ? [{ method: "CASH", amount: tendered }] : [],
        change: Math.max(0, tendered - total),
        remaining: Math.max(0, total - tendered),
      };
    }
    return {
      payments: total > 0 ? [{ method: input.method, amount: total }] : [],
      change: 0,
      remaining: 0,
    };
  }

  const cash = Math.max(0, Math.round(input.cashAmount));
  const momoCap = Math.max(0, total - cash);
  const requestedMomo =
    input.momoAmount == null ? momoCap : Math.max(0, Math.round(input.momoAmount));
  const momo = Math.min(requestedMomo, momoCap);
  const payments: { method: PaymentMethod; amount: number }[] = [];
  if (cash > 0) payments.push({ method: "CASH", amount: cash });
  if (momo > 0) payments.push({ method: "MOBILE_MONEY", amount: momo });
  const paid = cash + momo;
  return {
    payments,
    change: Math.max(0, cash - (total - momo)),
    remaining: Math.max(0, total - paid),
  };
}
