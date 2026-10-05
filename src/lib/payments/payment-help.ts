import { NERA_IDENTITY } from "@/lib/nera-identity";
import { whatsappChatUrl } from "@/lib/receipt";

/** Lien wa.me vers la boutique, message déjà rempli après un paiement refusé. */
export function paymentFailureWhatsAppUrl(orderNumber?: string) {
  const number = orderNumber?.trim();
  const text = number
    ? `Bonjour NERA Beauté, le paiement de ma commande ${number} n’a pas abouti. Pouvez-vous m’aider ?`
    : "Bonjour NERA Beauté, mon paiement n’a pas abouti. Pouvez-vous m’aider ?";
  return whatsappChatUrl(NERA_IDENTITY.phoneE164, text);
}
