import { NERA_IDENTITY } from "@/lib/nera-identity";
import { whatsappChatUrl } from "@/lib/receipt";

/** Visuel public de la bannière Njangi Skincare (1600×600). */
export const NJANGI_BANNER_SRC = "/brand/njangi-skincare.webp";
export const NJANGI_BANNER_WIDTH = 1600;
export const NJANGI_BANNER_HEIGHT = 600;

/**
 * Deux moitiés identiques (6 + 6).
 * L’animation translate de −50 % : la boucle est invisible,
 * et la piste reste plus large que l’écran.
 */
export const NJANGI_BANNER_COPIES = 12;

export const NJANGI_WHATSAPP_TEXT = `Bonjour NERA Beauté & Shop,

Je souhaite rejoindre le Njangi Skincare.

Petites cotisations, grande beauté : j’épargne aujourd’hui pour recevoir ma gamme personnalisée demain.

• Gamme personnalisée : 5 000 FCFA par mois pendant 6 mois, soit 30 000 FCFA
• Coffret VIP : 10 000 FCFA par mois pendant 6 mois, soit 60 000 FCFA

Merci de m’indiquer comment commencer la cotisation. Mon choix :`;

export const NJANGI_LINK_LABEL =
  "Publicité Njangi Skincare. Gamme personnalisée : 5 000 FCFA par mois pendant 6 mois, soit 30 000 FCFA. Coffret VIP : 10 000 FCFA par mois pendant 6 mois, soit 60 000 FCFA. Ouvre WhatsApp pour rejoindre.";

export function njangiWhatsAppUrl() {
  return whatsappChatUrl(NERA_IDENTITY.phoneE164, NJANGI_WHATSAPP_TEXT);
}
