export const PAYMENT_INSTRUCTIONS = {
  ORANGE: {
    id: "ORANGE" as const,
    label: "Orange Money",
    title: "Payer sans frais avec Orange Money",
    code: "#150*47*1059897#",
    name: "YORIX DIGITAL GROUP CM",
    detail:
      "Composez le code marchand Orange Money. Le paiement par code marchand se fait sans frais. Indiquez le numéro de commande dans le motif si demandé.",
  },
  MTN: {
    id: "MTN" as const,
    label: "MTN Mobile Money",
    title: "Transfert MTN Money",
    code: "676935195",
    name: "Kouekam Raisa",
    detail:
      "Effectuez un transfert MTN normal vers ce numéro. Précisez le numéro de commande dans le motif. Les frais d’opérateur MTN restent à votre charge.",
  },
};

export type PaymentNetwork = keyof typeof PAYMENT_INSTRUCTIONS;

export function isPaymentNetwork(value: string): value is PaymentNetwork {
  return value === "ORANGE" || value === "MTN";
}

export function shippingFeeFor(fulfillment: string, zoneFee: number) {
  return fulfillment === "DELIVERY" ? Math.max(0, zoneFee) : 0;
}

export function payableTotal(subtotal: number, discount: number, shippingFee: number) {
  return Math.max(0, subtotal - discount + shippingFee);
}
