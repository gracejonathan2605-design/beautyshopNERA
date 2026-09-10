import { formatCfa } from "./money";
import { NERA_IDENTITY } from "./nera-identity";
import { normalizeWhatsAppPhone } from "./receipt";

export type StaffOrderAlert = {
  number: string;
  customerName: string;
  customerPhone: string;
  fulfillment: "PICKUP" | "DELIVERY" | string;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  paymentLabel?: string | null;
  notes?: string | null;
  total: number;
  items: { productName: string; variantName?: string | null; quantity: number; total: number }[];
};

export function paymentNetworkLabel(raw?: string | null) {
  const value = (raw ?? "").toUpperCase();
  if (value === "ORANGE") return "Orange Money";
  if (value === "MTN") return "MTN MoMo";
  if (value === "CASH") return "Espèces";
  return raw?.trim() || "Mobile Money";
}

export function formatStaffOrderWhatsApp(order: StaffOrderAlert) {
  const lines = [
    "🛍️ COMMANDE SITE NERA",
    "",
    `Commande ${order.number} validée par le client.`,
    "",
    "👤 Cliente",
    `Nom : ${order.customerName.trim() || "Non renseigné"}`,
    `Téléphone : ${order.customerPhone.trim() || "Non renseigné"}`,
    "",
    "📦 Articles",
  ];
  if (!order.items.length) {
    lines.push("Aucun article listé.");
  } else {
    for (const item of order.items) {
      const variant =
        item.variantName && item.variantName !== "Default" && item.variantName.toLowerCase() !== "défaut"
          ? ` (${item.variantName})`
          : "";
      lines.push(`• ${item.productName}${variant} × ${item.quantity} — ${formatCfa(item.total)}`);
    }
  }
  lines.push("");
  if (order.fulfillment === "DELIVERY") {
    const where = [order.shippingAddress, order.shippingCity].filter(Boolean).join(", ");
    lines.push(`🚚 Livraison${where ? ` : ${where}` : ""}`);
  } else {
    lines.push("🏪 Retrait en boutique");
  }
  lines.push(`💰 Total : ${formatCfa(order.total)}`);
  if (order.paymentLabel) lines.push(`Paiement : ${order.paymentLabel} (à confirmer)`);
  if (order.notes?.trim()) {
    lines.push("");
    lines.push(`Note cliente : ${order.notes.trim()}`);
  }
  lines.push("");
  lines.push("Merci de confirmer le paiement puis de préparer la commande.");
  return lines.join("\n");
}

export function staffWhatsAppDestination() {
  return normalizeWhatsAppPhone(process.env.ORDER_WHATSAPP_TO || NERA_IDENTITY.phoneE164);
}

export async function sendStaffOrderWhatsApp(text: string) {
  const phone = staffWhatsAppDestination();
  const webhook = process.env.ORDER_NOTIFY_WEBHOOK?.trim();
  const callmebot = process.env.CALLMEBOT_APIKEY?.trim();
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const tasks: Promise<unknown>[] = [];

  if (webhook) {
    tasks.push(postJson(webhook, { text, phone, source: "nera-online-order" }));
  }

  if (callmebot && phone) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(callmebot)}`;
    tasks.push(getOk(url));
  }

  if (token && phoneNumberId && phone) {
    tasks.push(
      postJson(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text, preview_url: false },
      }, { Authorization: `Bearer ${token}` }),
    );
  }

  if (!tasks.length) return { sent: false, reason: "not-configured" as const };
  const results = await Promise.allSettled(tasks);
  const sent = results.some((row) => row.status === "fulfilled");
  return { sent, reason: sent ? ("ok" as const) : ("failed" as const) };
}

async function getOk(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`whatsapp ${res.status}`);
  return res;
}

async function postJson(url: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`whatsapp ${res.status}`);
  return res;
}

export async function notifyStaffNewOnlineOrder(order: StaffOrderAlert) {
  const text = formatStaffOrderWhatsApp(order);
  try {
    await sendStaffOrderWhatsApp(text);
  } catch {
    /* la commande client ne doit pas échouer si WhatsApp est indisponible */
  }
}
