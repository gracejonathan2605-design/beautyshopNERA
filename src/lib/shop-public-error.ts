import { NERA_IDENTITY } from "./nera-identity";

export const SHOP_PUBLIC_FALLBACK = `Impossible de terminer cette action pour le moment. Réessayez, ou contactez-nous au ${NERA_IDENTITY.phoneDisplay}.`;

export const SHOP_PAGE_UNAVAILABLE = `Cette page n’a pas pu s’afficher. Réessayez, ou contactez-nous au ${NERA_IDENTITY.phoneDisplay}.`;

const KNOWN = new Set([
  "Votre panier est vide.",
  "Un article n’est plus en vente. Revenez au panier pour le retirer.",
  "Stock insuffisant. Revenez au panier pour ajuster les quantités.",
  "Indiquez votre nom et votre téléphone.",
  "Choisissez une zone de livraison pour calculer les frais.",
  "Indiquez l’adresse et la ville de livraison.",
  "Connectez-vous pour modifier votre profil.",
  "Indiquez prénom, nom et email.",
  "Cet email est déjà utilisé.",
  "Ce téléphone est déjà utilisé.",
]);

const MAPPED: Record<string, string> = {
  "Panier vide": "Votre panier est vide.",
  "Produit indisponible en ligne": "Cet article n’est plus en vente. Revenez au panier pour le retirer.",
  "Produit indisponible": "Cet article n’est plus en vente.",
  "Zone de livraison requise": "Choisissez une zone de livraison pour calculer les frais.",
  "Zone de livraison inactive": "Cette zone de livraison n’est plus disponible. Choisissez-en une autre.",
  "Indiquez l’adresse et la ville de livraison.": "Indiquez l’adresse et la ville de livraison.",
  "Coupon invalide": "Ce code promo n’est pas valable.",
  "Ce code promo n’est plus disponible.": "Ce code promo n’est plus disponible.",
};

const HIDE =
  /AUTH_SECRET|DATABASE_URL|DIRECT_URL|prisma|P2024|P1001|EMAXCONN|max clients|connection pool|ECONN|ETIMEDOUT|fetch failed|undefined|sql|postgres|supabase|stack|permission refusee|failed to fetch|vercel/i;

export function shopPublicError(err: unknown) {
  const raw = err instanceof Error ? err.message.trim() : "";
  if (raw && KNOWN.has(raw)) return raw;
  if (raw && MAPPED[raw]) return MAPPED[raw];
  if (!raw || HIDE.test(raw) || raw.length > 140) return SHOP_PUBLIC_FALLBACK;
  return raw;
}
