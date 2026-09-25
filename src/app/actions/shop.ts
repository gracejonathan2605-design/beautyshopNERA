"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { checkoutLinesFromCart, clearCart, getCart, saveCart, upsertCartItem } from "@/lib/cart";
import { getCustomerSession, hashPassword } from "@/lib/auth";
import { createOnlineOrder } from "@/services/order.service";
import { isPaymentNetwork } from "@/lib/checkout";
import { orderConfirmationPath } from "@/lib/order-access";
import { quoteCoupon } from "@/lib/coupon";
import { prisma } from "@/lib/prisma";
import { sellableOnlineWhere, shopInventorySelect } from "@/lib/product-query";
import { variantAvailable } from "@/lib/stock-display";
import { shopPublicError } from "@/lib/shop-public-error";
import { rateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/monitor";
import { uploadProductImage } from "@/lib/storage";
import { attachGuestOrdersByPhone, findCustomerByPhone } from "@/services/customer.service";

async function availableForVariant(variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, ...sellableOnlineWhere },
    select: { inventories: shopInventorySelect },
  });
  if (!variant) return 0;
  return variantAvailable(variant.inventories);
}

export async function addToCart(variantId: string, quantity = 1) {
  const available = await availableForVariant(variantId);
  if (available <= 0) return { ok: false as const };
  const cart = await getCart();
  const current = cart.find((i) => i.variantId === variantId)?.quantity ?? 0;
  const count = await saveCart(upsertCartItem(cart, variantId, Math.min(current + quantity, available)));
  revalidatePath("/panier");
  return { ok: true as const, count };
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

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: cart.map((i) => i.variantId) }, ...sellableOnlineWhere },
      select: { id: true, inventories: shopInventorySelect },
    });
    const availableByVariant = new Map(
      variants.map((variant) => [variant.id, variantAvailable(variant.inventories)]),
    );
    const ready = checkoutLinesFromCart(cart, availableByVariant);
    if (!ready.ok) {
      if (ready.reason === "empty") return { ok: false, error: "Votre panier est vide." };
      if (ready.reason === "stale") {
        return { ok: false, error: "Un article n’est plus en vente. Revenez au panier pour le retirer." };
      }
      return { ok: false, error: "Stock insuffisant. Revenez au panier pour ajuster les quantités." };
    }

    const name = String(formData.get("shippingName") ?? "").trim();
    const phone = String(formData.get("shippingPhone") ?? "").trim();
    if (!name || !phone) return { ok: false, error: "Indiquez votre nom et votre téléphone." };
    if (!rateLimit(`checkout:${phone}`, 5, 10 * 60 * 1000)) {
      return { ok: false, error: "Trop de commandes sur ce numéro. Réessayez dans quelques minutes." };
    }

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
        lines: ready.lines,
        payment: {
          method: "MOBILE_MONEY",
          amount: 0,
          reference: network,
          provider: network,
        },
      });
      if (session?.customerId) {
        const phoneTaken = phone ? await findCustomerByPhone(phone, session.customerId) : null;
        await prisma.customer.update({
          where: { id: session.customerId },
          data: {
            ...(phone && !phoneTaken ? { phone } : {}),
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
    reportError("checkout", err);
    return { ok: false, error: shopPublicError(err) };
  }
}

export async function submitPaymentProof(formData: FormData) {
  const number = String(formData.get("number") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  if (!number || !reference) redirect(`/commande/${encodeURIComponent(number)}?erreur=preuve`);
  const { isValidOrderAccessToken, orderConfirmationPath } = await import("@/lib/order-access");
  const session = await getCustomerSession();
  const order = await prisma.order.findUnique({
    where: { number },
    include: { payments: true },
  });
  const allowed =
    order &&
    (isValidOrderAccessToken(number, token) || (session && order.customerId === session.customerId));
  if (!order || !allowed) redirect("/panier");
  const pending = order.payments.find((p) => p.status === "PENDING") ?? order.payments[0];
  const back = token ? `${orderConfirmationPath(number)}` : `/commande/${encodeURIComponent(number)}`;
  if (!pending) redirect(back);
  let proofUrl: string | null = null;
  const file = formData.get("proof");
  if (file instanceof File && file.size > 0) {
    try {
      proofUrl = await uploadProductImage(file, `payments/${order.id}`, 0);
    } catch (err) {
      reportError("payment-proof", err);
    }
  }
  await prisma.payment.update({
    where: { id: pending.id },
    data: {
      reference,
      proofUrl: proofUrl ?? pending.proofUrl,
      note: pending.note,
    },
  });
  revalidatePath(`/commande/${number}`);
  revalidatePath(`/admin/commandes/${order.id}`);
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=preuve`);
}

export async function requestRestock(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!productId || !phone) redirect(slug ? `/produit/${slug}` : "/boutique");
  if (!rateLimit(`restock:${phone}`, 6, 60 * 60 * 1000)) {
    redirect(slug ? `/produit/${slug}?erreur=relance` : "/boutique");
  }
  const existing = await prisma.restockRequest.findFirst({
    where: { productId, phone, notifiedAt: null },
    select: { id: true },
  });
  if (!existing) {
    await prisma.restockRequest.create({ data: { productId, phone } });
  }
  redirect(slug ? `/produit/${slug}?ok=relance` : "/boutique");
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
      const phoneTaken = await findCustomerByPhone(phone, session.customerId);
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
    return { ok: false, error: shopPublicError(err) };
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
