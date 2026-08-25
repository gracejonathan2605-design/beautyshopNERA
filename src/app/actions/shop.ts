"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { clearCart, getCart, saveCart, upsertCartItem } from "@/lib/cart";
import { getCustomerSession } from "@/lib/auth";
import { createOnlineOrder } from "@/services/order.service";
import { isPaymentNetwork } from "@/lib/checkout";

export async function addToCart(variantId: string, quantity = 1) {
  const cart = await getCart();
  const current = cart.find((i) => i.variantId === variantId)?.quantity ?? 0;
  await saveCart(upsertCartItem(cart, variantId, current + quantity));
  revalidatePath("/panier");
  revalidatePath("/");
}

export async function setCartQty(variantId: string, quantity: number) {
  const cart = await getCart();
  await saveCart(upsertCartItem(cart, variantId, quantity));
  revalidatePath("/panier");
  revalidatePath("/");
}

export async function setCartQtyForm(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!variantId) return;
  await setCartQty(variantId, Number.isFinite(quantity) ? quantity : 0);
}

export type CheckoutState = { ok: boolean; error?: string };

export async function checkoutOrder(_prev: CheckoutState | null, formData: FormData): Promise<CheckoutState> {
  try {
    const session = await getCustomerSession();
    const cart = await getCart();
    if (!cart.length) return { ok: false, error: "Votre panier est vide." };

    const name = String(formData.get("shippingName") ?? "").trim();
    const phone = String(formData.get("shippingPhone") ?? "").trim();
    if (!name || !phone) return { ok: false, error: "Indiquez votre nom et votre téléphone." };

    const fulfillment = String(formData.get("fulfillment") ?? "PICKUP") === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const deliveryZoneId = String(formData.get("deliveryZoneId") ?? "").trim() || null;
    if (fulfillment === "DELIVERY" && !deliveryZoneId) {
      return { ok: false, error: "Choisissez une zone de livraison pour calculer les frais." };
    }

    const networkRaw = String(formData.get("paymentNetwork") ?? "ORANGE");
    const network = isPaymentNetwork(networkRaw) ? networkRaw : "ORANGE";

    const order = await createOnlineOrder({
      customerId: session?.customerId,
      fulfillment,
      deliveryZoneId,
      shippingName: name,
      shippingPhone: phone,
      shippingAddress: String(formData.get("shippingAddress") ?? ""),
      shippingCity: String(formData.get("shippingCity") ?? ""),
      couponCode: String(formData.get("couponCode") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || undefined,
      lines: cart.filter((l) => l.quantity > 0),
      payment: {
        method: "MOBILE_MONEY",
        amount: 0,
        reference: network,
        provider: network,
      },
    });
    await clearCart();
    revalidatePath("/panier");
    revalidatePath("/");
    redirect(`/commande/${order.number}`);
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: err instanceof Error ? err.message : "Commande impossible pour le moment." };
  }
}
