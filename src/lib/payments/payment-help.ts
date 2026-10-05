import { NERA_IDENTITY } from "@/lib/nera-identity";
import { whatsappChatUrl } from "@/lib/receipt";

const PLACEHOLDER_REFERENCES = new Set(["ORANGE", "MTN"]);

/** Garde la référence opérateur (MessageId) si le client envoie ensuite une preuve. */
export function paymentReferenceAfterProof(current: string | null | undefined, typed: string) {
  const value = current?.trim() ?? "";
  if (value && !PLACEHOLDER_REFERENCES.has(value)) return value;
  return typed.trim();
}

/** Lien wa.me vers la boutique, message déjà rempli après un paiement refusé. */
export function paymentFailureWhatsAppUrl(orderNumber?: string) {
  const number = orderNumber?.trim();
  const text = number
    ? `Bonjour NERA Beauté, le paiement de ma commande ${number} n’a pas abouti. Pouvez-vous m’aider ?`
    : "Bonjour NERA Beauté, mon paiement n’a pas abouti. Pouvez-vous m’aider ?";
  return whatsappChatUrl(NERA_IDENTITY.phoneE164, text);
}
