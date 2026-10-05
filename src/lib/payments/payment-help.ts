import { NERA_IDENTITY } from "@/lib/nera-identity";
import { whatsappChatUrl } from "@/lib/receipt";

const PLACEHOLDER_REFERENCES = new Set(["ORANGE", "MTN"]);

/** Garde la référence opérateur (MessageId) si le client envoie ensuite une preuve. */
export function paymentReferenceAfterProof(current: string | null | undefined, typed: string) {
  const value = current?.trim() ?? "";
  if (value && !PLACEHOLDER_REFERENCES.has(value)) return value;
  return typed.trim();
}

export type PaymentBadge = "paid" | "refused" | "pending";

export function paymentNoteIsRefusal(note?: string | null) {
  return Boolean(note && /paiement (?:mtn |orange )?refusé/i.test(note));
}

export function paymentBadgeFromNote(paid: boolean, note?: string | null): PaymentBadge {
  if (paid) return "paid";
  if (paymentNoteIsRefusal(note)) return "refused";
  return "pending";
}

export function paymentBadgeLabel(badge: PaymentBadge, note?: string | null) {
  if (badge === "paid") return "Payé";
  if (badge === "refused" && note?.toLowerCase().includes("solde")) return "Refusé (solde)";
  if (badge === "refused") return "Refusé";
  return "En attente";
}

/** Lien wa.me vers la boutique, message déjà rempli après un paiement refusé. */
export function paymentFailureWhatsAppUrl(orderNumber?: string) {
  const number = orderNumber?.trim();
  const text = number
    ? `Bonjour NERA Beauté, le paiement de ma commande ${number} n’a pas abouti. Pouvez-vous m’aider ?`
    : "Bonjour NERA Beauté, mon paiement n’a pas abouti. Pouvez-vous m’aider ?";
  return whatsappChatUrl(NERA_IDENTITY.phoneE164, text);
}
