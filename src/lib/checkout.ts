import { paymentInstructions } from "./payments/mobile-money";

export const PAYMENT_INSTRUCTIONS = paymentInstructions();

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
