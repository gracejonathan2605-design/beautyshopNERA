import { formatCfa } from "./money";

export const RECEIPT_WIDTH = 32;

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Carte",
  BANK_TRANSFER: "Virement",
  ONLINE: "En ligne",
  OTHER: "Autre",
};

export type ReceiptShop = {
  name: string;
  slogan?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  mtnPhone?: string;
  rccm?: string;
  nui?: string;
  ticketFooter?: string;
};

export type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ReceiptPayment = {
  method: string;
  amount: number;
};

export type ReceiptData = {
  shop: ReceiptShop;
  number: string;
  date: Date | string;
  cashier?: string;
  customer?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  payments: ReceiptPayment[];
};

export function paymentLabel(method: string) {
  return PAYMENT_LABELS[method] ?? method;
}

export function centerLine(text: string, width = RECEIPT_WIDTH) {
  const t = text.trim().slice(0, width);
  const pad = Math.max(0, width - t.length);
  const left = Math.floor(pad / 2);
  return `${" ".repeat(left)}${t}${" ".repeat(pad - left)}`;
}

export function dashLine(width = RECEIPT_WIDTH) {
  return "-".repeat(width);
}

export function wrapLine(text: string, width = RECEIPT_WIDTH): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (word.length > width) {
      for (let i = 0; i < word.length; i += width) {
        const chunk = word.slice(i, i + width);
        if (chunk.length === width) lines.push(chunk);
        else current = chunk;
      }
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function pairLine(left: string, right: string, width = RECEIPT_WIDTH) {
  const r = right.slice(0, width);
  const maxLeft = Math.max(0, width - r.length - 1);
  const l = left.length > maxLeft ? `${left.slice(0, Math.max(0, maxLeft - 1))}…` : left;
  const gap = Math.max(1, width - l.length - r.length);
  return `${l}${" ".repeat(gap)}${r}`;
}

export function formatReceiptDate(date: Date | string) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function moneyPlain(amount: number) {
  return formatCfa(amount).replace(/\u202f/g, " ");
}

export function buildReceiptText(data: ReceiptData) {
  const lines: string[] = [
    centerLine(data.shop.name.toUpperCase()),
    ...(data.shop.slogan ? wrapLine(data.shop.slogan) : []),
    ...(data.shop.address ? wrapLine(data.shop.address) : []),
    ...(data.shop.city ? [centerLine(data.shop.city)] : []),
    ...(data.shop.phone ? [centerLine(data.shop.phone)] : []),
    ...(data.shop.email ? [centerLine(data.shop.email)] : []),
    ...(data.shop.mtnPhone ? [centerLine(`MoMo ${data.shop.mtnPhone}`)] : []),
    ...(data.shop.rccm ? wrapLine(`RCCM ${data.shop.rccm}`) : []),
    ...(data.shop.nui ? wrapLine(`NUI ${data.shop.nui}`) : []),
    centerLine("OM · MoMo"),
    centerLine("Livraison 24h"),
    dashLine(),
    pairLine("Ticket", data.number),
    pairLine("Date", formatReceiptDate(data.date)),
  ];
  if (data.cashier) lines.push(pairLine("Caisse", data.cashier));
  if (data.customer) lines.push(...wrapLine(`Client: ${data.customer}`));
  lines.push(dashLine());
  for (const item of data.items) {
    lines.push(...wrapLine(item.name));
    lines.push(pairLine(`${item.quantity} x ${moneyPlain(item.unitPrice)}`, moneyPlain(item.total)));
  }
  lines.push(dashLine());
  lines.push(pairLine("Sous-total", moneyPlain(data.subtotal)));
  if (data.discount > 0) lines.push(pairLine("Remise", `-${moneyPlain(data.discount)}`));
  lines.push(pairLine("TOTAL", moneyPlain(data.total)));
  lines.push(dashLine());
  for (const payment of data.payments) {
    lines.push(pairLine(paymentLabel(payment.method), moneyPlain(payment.amount)));
  }
  const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid > data.total) lines.push(pairLine("Monnaie", moneyPlain(paid - data.total)));
  if (data.shop.ticketFooter) {
    lines.push(dashLine());
    lines.push(...wrapLine(data.shop.ticketFooter));
  }
  lines.push("");
  lines.push(centerLine("À bientôt chez NERA"));
  return lines.join("\n");
}

/** Cameroon numbers: 6XXXXXXXX → 2376XXXXXXXX */
export function normalizeWhatsAppPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("237") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `237${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("6")) return `237${digits}`;
  return digits;
}

export function whatsappReceiptUrl(text: string, phone?: string) {
  const encoded = encodeURIComponent(text);
  const normalized = phone ? normalizeWhatsAppPhone(phone) : "";
  if (normalized) return `https://wa.me/${normalized}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

export function saleToReceipt(
  sale: {
    number: string;
    createdAt: Date | string;
    subtotal: number;
    discount: number;
    total: number;
    items: { productName: string; variantName?: string | null; quantity: number; unitPrice: number; total: number; discount?: number }[];
    payments: { method: string; amount: number }[];
    cashier?: { firstName: string; lastName: string } | null;
    customer?: { firstName: string; lastName: string; phone?: string | null } | null;
  },
  shop: ReceiptShop,
): ReceiptData {
  const date = sale.createdAt instanceof Date ? sale.createdAt : new Date(sale.createdAt);
  const customerName = sale.customer
    ? `${sale.customer.firstName} ${sale.customer.lastName}`.trim()
    : null;
  const lineDiscount = sale.items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  return {
    shop,
    number: sale.number,
    date,
    cashier: sale.cashier ? `${sale.cashier.firstName} ${sale.cashier.lastName}`.trim() : undefined,
    customer: customerName || null,
    customerPhone: sale.customer?.phone ?? null,
    items: sale.items.map((item) => ({
      name: item.variantName && item.variantName !== "Default" ? `${item.productName} (${item.variantName})` : item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount + lineDiscount,
    total: sale.total,
    payments: sale.payments.map((p) => ({ method: p.method, amount: p.amount })),
  };
}

export function whatsappChatUrl(phone: string, text?: string) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return "";
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${normalized}${q}`;
}
