"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { clearCart, getCart, saveCart, upsertCartItem } from "@/lib/cart";
import { getCustomerSession, hashPassword } from "@/lib/auth";
import { createOnlineOrder } from "@/services/order.service";
import { isPaymentNetwork } from "@/lib/checkout";
import { orderConfirmationPath } from "@/lib/order-access";
import { quoteCoupon } from "@/lib/coupon";
import { prisma } from "@/lib/prisma";
import { sellableOnlineWhere } from "@/lib/product-query";
import { variantAvailable } from "@/lib/stock-display";
import { attachGuestOrdersByPhone } from "@/services/customer.service";

async function availableForVariant(variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, ...sellableOnlineWhere },
    select: { inventories: { select: { onHand: true, reserved: true } } },
  });
  if (!variant) return 0;
  return variantAvailable(variant.inventories);
}

export async function addToCart(variantId: string, quantity = 1) {
  const available = await availableForVariant(variantId);
  if (available <= 0) return { ok: false as const };
  const cart = await getCart();
  const current = cart.find((i) => i.variantId === variantId)?.quantity ?? 0;
  await saveCart(upsertCartItem(cart, variantId, Math.min(current + quantity, available)));
  revalidatePath("/panier");
  revalidatePath("/");
  return { ok: true as const };
}

export async function setCartQty(variantId: string, quantity: number) {
  const cart = await getCart();
  if (quantity <= 0) {
    await saveCart(upsertCartItem(cart, variantId, 0));
  } else {
    const available = await availableForVariant(variantId);
    await saveCart(upsertCartItem(cart, variantId, Math.min(quantity, available)));
  }
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

export async function previewCheckoutCoupon(code: string, subtotal: number) {
  return quoteCoupon(code, subtotal);
}

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
    const shippingAddress = String(formData.get("shippingAddress") ?? "").trim();
    const shippingCity = String(formData.get("shippingCity") ?? "").trim();
    if (fulfillment === "DELIVERY" && (!shippingAddress || !shippingCity)) {
      return { ok: false, error: "Indiquez l’adresse et la ville de livraison." };
    }

    try {
      const order = await createOnlineOrder({
        customerId: session?.customerId,
        fulfillment,
        deliveryZoneId,
        shippingName: name,
        shippingPhone: phone,
        shippingAddress,
        shippingCity,
        couponCode: String(formData.get("couponCode") ?? ""),
        notes: String(formData.get("notes") ?? "") || undefined,
        lines: cart,
        payment: {
          method: "MOBILE_MONEY",
          amount: 0,
          reference: network,
          provider: network,
        },
      });
      if (session?.customerId) {
        await prisma.customer.update({
          where: { id: session.customerId },
          data: {
            phone: phone || undefined,
            ...(shippingAddress ? { address: shippingAddress } : {}),
            ...(shippingCity ? { city: shippingCity } : {}),
          },
        });
      }
      await clearCart();
      revalidatePath("/panier");
      revalidatePath("/");
      revalidatePath("/compte");
      redirect(orderConfirmationPath(order.number));
    } catch (err) {
      unstable_rethrow(err);
      throw err;
    }
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: err instanceof Error ? err.message : "Commande impossible pour le moment." };
  }
}

export type ProfileState = { ok: boolean; error?: string };

export async function updateCustomerProfile(
  _prev: ProfileState | null,
  formData: FormData,
): Promise<ProfileState> {
  try {
    const session = await getCustomerSession();
    if (!session) return { ok: false, error: "Connectez-vous pour modifier votre profil." };
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!firstName || !lastName || !email) {
      return { ok: false, error: "Indiquez prénom, nom et email." };
    }
    const emailTaken = await prisma.customer.findFirst({
      where: { email, deletedAt: null, NOT: { id: session.customerId } },
      select: { id: true },
    });
    if (emailTaken) return { ok: false, error: "Cet email est déjà utilisé." };
    if (phone) {
      const phoneTaken = await prisma.customer.findFirst({
        where: { phone, deletedAt: null, NOT: { id: session.customerId } },
        select: { id: true },
      });
      if (phoneTaken) return { ok: false, error: "Ce téléphone est déjà utilisé." };
    }
    await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        ...(password.length >= 8 ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
    if (phone) await attachGuestOrdersByPhone(session.customerId, phone);
    revalidatePath("/compte");
    revalidatePath("/checkout");
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Cet email est déjà utilisé." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Enregistrement impossible." };
  }
}

export async function reorderFromOrder(formData: FormData) {
  const session = await getCustomerSession();
  if (!session) redirect("/compte/connexion");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: session.customerId },
    include: { items: true },
  });
  if (!order) redirect("/compte?erreur=commande");
  const cart = await getCart();
  let added = 0;
  let skipped = 0;
  let next = cart;
  for (const item of order.items) {
    const available = await availableForVariant(item.variantId);
    if (available <= 0) {
      skipped += 1;
      continue;
    }
    const current = next.find((row) => row.variantId === item.variantId)?.quantity ?? 0;
    const qty = Math.min(current + item.quantity, available);
    if (qty > current) added += 1;
    next = upsertCartItem(next, item.variantId, qty);
  }
  await saveCart(next);
  revalidatePath("/panier");
  if (!added) redirect("/compte?erreur=rupture");
  redirect(`/panier?ajoute=${added}${skipped ? `&ignore=${skipped}` : ""}`);
}
