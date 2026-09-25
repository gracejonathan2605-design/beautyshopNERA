import type { OrderStatus } from "@prisma/client";

export const CUSTOMER_STEPS = ["Reçue", "Payée", "En préparation", "En route ou prête", "Livrée"] as const;

export function customerStepIndex(status: OrderStatus, paid: boolean) {
  if (status === "CANCELLED" || status === "REFUNDED") return -1;
  if (status === "DELIVERED") return 4;
  if (status === "SHIPPED" || status === "READY") return 3;
  if (status === "PREPARING" || status === "CONFIRMED") return paid ? 2 : 1;
  return paid ? 1 : 0;
}

export function customerStatusSentence(status: OrderStatus, paid: boolean) {
  if (status === "CANCELLED") return "Cette commande a été annulée.";
  if (status === "REFUNDED") return "Cette commande a été remboursée.";
  if (!paid) return "Nous avons reçu la commande. Le paiement est encore à confirmer.";
  if (status === "PENDING" || status === "CONFIRMED") return "Paiement reçu. Nous préparons votre commande.";
  if (status === "PREPARING") return "Votre commande est en préparation.";
  if (status === "READY") return "Votre commande est prête en boutique.";
  if (status === "SHIPPED") return "Votre commande est en cours de livraison.";
  return "Votre commande est livrée. Merci.";
}
