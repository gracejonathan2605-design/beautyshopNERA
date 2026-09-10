import { formatCfa } from "./money";
import { NERA_IDENTITY } from "./nera-identity";
import { normalizeWhatsAppPhone } from "./receipt";
import { getShopSettings, type ShopSettings } from "./settings";

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

export type OrderAlertStored = Pick<
  ShopSettings,
  "orderWhatsAppTo" | "greenApiId" | "greenApiToken" | "greenApiUrl"
>;

export type OrderAlertChannels = {
  phone: string;
  webhook?: string;
  callmebot?: string;
  whatsappToken?: string;
  whatsappPhoneNumberId?: string;
  greenApiId?: string;
  greenApiToken?: string;
  greenApiUrl?: string;
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

export function normalizeGreenApiUrl(raw?: string | null) {
  const value = (raw ?? "").trim().replace(/\/$/, "");
  if (!value) return "";
  return value.replace(/\/waInstance.*$/i, "");
}

/** Green API refuse +, espaces et @c.us. Numéro boutique : 237 + 9 chiffres. */
export function greenApiPhoneNumber(raw?: string | null) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length === 12 && digits[3] === "6") return digits;
  if (digits.startsWith("0") && digits.length === 10 && digits[1] === "6") return `237${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("6")) return `237${digits}`;
  return normalizeWhatsAppPhone(NERA_IDENTITY.phoneE164) || "237676935195";
}

export function greenApiChatId(phone: string) {
  const digits = greenApiPhoneNumber(phone);
  if (!digits) return "";
  return `${digits}@c.us`;
}

export function greenApiSendUrl(apiUrl: string, id: string, token: string) {
  return `${normalizeGreenApiUrl(apiUrl) || "https://api.green-api.com"}/waInstance${id.trim()}/sendMessage/${token.trim()}`;
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function resolveOrderAlertChannels(stored?: Partial<OrderAlertStored> | null): OrderAlertChannels {
  const phone = greenApiPhoneNumber(
    firstText(process.env.ORDER_WHATSAPP_TO, stored?.orderWhatsAppTo, NERA_IDENTITY.phoneE164),
  );
  return {
    phone,
    webhook: process.env.ORDER_NOTIFY_WEBHOOK?.trim() || undefined,
    callmebot: process.env.CALLMEBOT_APIKEY?.trim() || undefined,
    whatsappToken: process.env.WHATSAPP_TOKEN?.trim() || undefined,
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || undefined,
    greenApiId: firstText(process.env.GREEN_API_ID, stored?.greenApiId) || undefined,
    greenApiToken: firstText(process.env.GREEN_API_TOKEN, stored?.greenApiToken) || undefined,
    greenApiUrl: normalizeGreenApiUrl(firstText(process.env.GREEN_API_URL, stored?.greenApiUrl)) || undefined,
  };
}

export function staffWhatsAppDestination(stored?: Partial<OrderAlertStored> | null) {
  return resolveOrderAlertChannels(stored).phone;
}

export async function sendStaffOrderWhatsApp(text: string, stored?: Partial<OrderAlertStored> | null) {
  const channels = resolveOrderAlertChannels(stored);
  const { phone } = channels;
  const tasks: Promise<unknown>[] = [];

  if (channels.webhook) {
    tasks.push(postJson(channels.webhook, { text, phone, source: "nera-online-order" }));
  }

  if (channels.greenApiId && channels.greenApiToken && phone) {
    const chatId = greenApiChatId(phone);
    tasks.push(
      postJson(greenApiSendUrl(channels.greenApiUrl ?? "", channels.greenApiId, channels.greenApiToken), {
        chatId,
        message: text,
        linkPreview: false,
      }),
    );
  }

  if (channels.callmebot && phone) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(channels.callmebot)}`;
    tasks.push(getOk(url));
  }

  if (channels.whatsappToken && channels.whatsappPhoneNumberId && phone) {
    tasks.push(
      postJson(
        `https://graph.facebook.com/v21.0/${channels.whatsappPhoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: text, preview_url: false },
        },
        { Authorization: `Bearer ${channels.whatsappToken}` },
      ),
    );
  }

  if (!tasks.length) return { sent: false, reason: "not-configured" as const, detail: "" };
  const results = await Promise.allSettled(tasks);
  const sent = results.some((row) => row.status === "fulfilled");
  const rejected = results.find((row): row is PromiseRejectedResult => row.status === "rejected");
  const detail = rejected?.reason instanceof Error ? rejected.reason.message : "";
  return { sent, reason: sent ? ("ok" as const) : ("failed" as const), detail };
}

async function getOk(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`whatsapp ${res.status}`);
  return res;
}

function summarizeGreenApiError(body: string, status: number) {
  try {
    const json = JSON.parse(body) as { message?: string; error?: string };
    const message = String(json.message ?? json.error ?? "");
    if (/phoneNumber|phone number/i.test(message)) {
      return "Green API attend le numéro 237676935195 — uniquement des chiffres, sans + ni espaces ni @c.us.";
    }
    if (message) return message.slice(0, 180);
  } catch {
    /* corps non JSON */
  }
  return `whatsapp ${status}`;
}

async function postJson(url: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(summarizeGreenApiError(text, res.status));
  }
  return res;
}

export async function notifyStaffNewOnlineOrder(order: StaffOrderAlert) {
  const text = formatStaffOrderWhatsApp(order);
  try {
    const settings = await getShopSettings().catch(() => null);
    await sendStaffOrderWhatsApp(text, settings);
  } catch {
    /* la commande client ne doit pas échouer si WhatsApp est indisponible */
  }
}
