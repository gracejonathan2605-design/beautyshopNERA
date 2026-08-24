"use server";

import { revalidatePath } from "next/cache";
import { clearCart, getCart, saveCart, upsertCartItem } from "@/lib/cart";
import { getCustomerSession } from "@/lib/auth";
import { createOnlineOrder } from "@/services/order.service";

export async function addToCart(variantId: string, quantity = 1) {
  const cart = await getCart();
  const current = cart.find((i) => i.variantId === variantId)?.quantity ?? 0;
  await saveCart(upsertCartItem(cart, variantId, current + quantity));
  revalidatePath("/panier");
}

export async function setCartQty(variantId: string, quantity: number) {
  const cart = await getCart();
  await saveCart(upsertCartItem(cart, variantId, quantity));
  revalidatePath("/panier");
}

export async function checkoutOrder(formData: FormData) {
  const session = await getCustomerSession();
  const cart = await getCart();
  if (!cart.length) throw new Error("Panier vide");
  const fulfillment = String(formData.get("fulfillment") ?? "PICKUP") === "DELIVERY" ? "DELIVERY" : "PICKUP";
  const order = await createOnlineOrder({
    customerId: session?.customerId,
    fulfillment,
    deliveryZoneId: formData.get("deliveryZoneId") ? String(formData.get("deliveryZoneId")) : null,
    shippingName: String(formData.get("shippingName") ?? ""),
    shippingPhone: String(formData.get("shippingPhone") ?? ""),
    shippingAddress: String(formData.get("shippingAddress") ?? ""),
    shippingCity: String(formData.get("shippingCity") ?? ""),
    couponCode: String(formData.get("couponCode") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || undefined,
    lines: cart,
    payment: {
      method: "MOBILE_MONEY",
      amount: Number(formData.get("amount") ?? 0),
      reference: "MANUEL-A-CONFIRMER",
    },
  });
  await clearCart();
  return order.number;
}
