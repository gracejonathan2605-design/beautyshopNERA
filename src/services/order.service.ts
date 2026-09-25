import { after } from "next/server";
import { FulfillmentType, OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStockChange } from "@/services/inventory.service";
import { formatRef, nextSequence } from "@/lib/sequences";
import { getDefaultLocationId, getShopSettings } from "@/lib/settings";
import { notify } from "@/lib/audit";
import { notifyCustomerAboutOrder, notifyStaffNewOnlineOrder, paymentNetworkLabel } from "@/lib/order-alert";
import { customerStatusSentence } from "@/lib/order-timeline";
import { paymentInstructions, startMobileMoneyCharge } from "@/lib/payments/mobile-money";
import { reportError } from "@/lib/monitor";
import { canTransitionOrder, releasesCouponOnStatus, stockEffectForTransition } from "@/lib/order-flow";
import { unitPrice as priced } from "@/lib/pricing";
import { couponDiscountAmount, couponClaimFilter, explainCouponFailure, normalizeCouponCode } from "@/lib/coupon";
import { normalizeCartItems } from "@/lib/cart";
import { findCustomerByPhone } from "@/services/customer.service";
import { unpaidOrderCutoff } from "@/lib/pending-orders";

export async function createOnlineOrder(input: {
  customerId?: string | null;
  fulfillment: FulfillmentType;
  deliveryZoneId?: string | null;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  couponCode?: string | null;
  notes?: string;
  lines: { variantId: string; quantity: number }[];
  payment?: { method: PaymentMethod; amount: number; reference?: string; provider?: string };
}) {
  if (!input.lines.length) throw new Error("Panier vide");
  const lines = normalizeCartItems(input.lines);
  if (!lines.length) throw new Error("Panier vide");
  if (input.fulfillment === "DELIVERY") {
    if (!input.shippingAddress?.trim() || !input.shippingCity?.trim()) {
      throw new Error("Indiquez l’adresse et la ville de livraison.");
    }
  }
  const couponCode = normalizeCouponCode(input.couponCode);
  const locationId = await getDefaultLocationId();
  let customerId = input.customerId ?? null;
  if (!customerId && input.shippingPhone) {
    const existing = await findCustomerByPhone(input.shippingPhone);
    if (existing) customerId = existing.id;
  }

  const order = await prisma.$transaction(async (tx) => {
    const settings = await getShopSettings(tx);
    const seq = await nextSequence(tx, "order");
    const number = formatRef(settings.prefixes.order, seq.year, seq.value);

    let shippingFee = 0;
    if (input.fulfillment === "DELIVERY") {
      if (!input.deliveryZoneId) throw new Error("Zone de livraison requise");
      const zone = await tx.deliveryZone.findUnique({ where: { id: input.deliveryZoneId } });
      if (!zone || !zone.isActive) throw new Error("Zone de livraison inactive");
      shippingFee = zone.fee;
    }

    const variants = await tx.productVariant.findMany({
      where: { id: { in: lines.map((l) => l.variantId) } },
      include: { product: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    const items: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    for (const line of lines) {
      const variant = byId.get(line.variantId);
      if (!variant || !variant.isActive || variant.deletedAt || variant.product.deletedAt || !variant.product.onlineVisible) {
        throw new Error("Produit indisponible en ligne");
      }
      if (variant.product.status !== "ACTIVE") throw new Error("Produit indisponible");
      const unitPrice = priced(variant);
      subtotal += unitPrice * line.quantity;
      items.push({
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: line.quantity,
        unitPrice,
        total: unitPrice * line.quantity,
      });
    }

    let discount = 0;
    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
      const couponError = explainCouponFailure(coupon, subtotal);
      if (couponError || !coupon) throw new Error(couponError ?? "Coupon invalide");
      discount = couponDiscountAmount(coupon.type, coupon.value, subtotal);
      const claimed = await tx.coupon.updateMany({
        where: couponClaimFilter(coupon),
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error("Ce code promo n’est plus disponible.");
    }

    const total = Math.max(0, subtotal - discount + shippingFee);

    const created = await tx.order.create({
      data: {
        number,
        customerId: customerId ?? undefined,
        fulfillment: input.fulfillment,
        subtotal,
        discount,
        shippingFee,
        total,
        notes: input.notes,
        deliveryZoneId: input.deliveryZoneId ?? undefined,
        shippingName: input.shippingName,
        shippingPhone: input.shippingPhone,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        couponCode,
        items: { create: items },
        payments: input.payment
          ? {
              create: {
                amount: input.payment.amount > 0 ? input.payment.amount : total,
                method: input.payment.method,
                reference: input.payment.reference,
                provider: input.payment.provider ?? "MANUAL",
                status: "PENDING",
              },
            }
          : undefined,
      },
      include: { items: true, payments: true },
    });

    for (const line of lines) {
      await applyStockChange(tx, {
        variantId: line.variantId,
        locationId,
        type: "SALE_ONLINE",
        quantity: 0,
        reserveDelta: line.quantity,
        reference: created.number,
        comment: "Réservation commande en ligne",
      });
    }

    return created;
  });

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const articleWord = itemCount > 1 ? "articles" : "article";
  const who = [order.shippingName, order.shippingPhone].filter(Boolean).join(" · ");
  try {
    await notify({
      type: "NEW_ORDER",
      title: "Nouvelle commande",
      message: `Commande ${order.number} validée${who ? ` par ${who}` : ""} — ${itemCount} ${articleWord} — ${order.total} FCFA`,
    });
  } catch {
    /* la commande client est déjà créée */
  }

  const paymentHint = order.payments[0]?.reference || order.payments[0]?.provider;
  const alert = {
    number: order.number,
    customerName: order.shippingName ?? "",
    customerPhone: order.shippingPhone ?? "",
    fulfillment: order.fulfillment,
    shippingAddress: order.shippingAddress,
    shippingCity: order.shippingCity,
    paymentLabel: paymentNetworkLabel(paymentHint),
    notes: order.notes,
    total: Number(order.total),
    items: order.items.map((item) => ({
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      total: Number(item.total),
    })),
  };
  try {
    after(() => notifyStaffNewOnlineOrder(alert));
  } catch {
    void notifyStaffNewOnlineOrder(alert);
  }

  const network = order.payments[0]?.provider === "MTN" ? "MTN" : "ORANGE";
  if (order.payments[0] && order.total > 0) {
    try {
      const charge = await startMobileMoneyCharge({
        network,
        amount: Number(order.total),
        orderNumber: order.number,
        phone: order.shippingPhone ?? "",
      });
      if (charge.mode === "api" && charge.providerReference !== network) {
        await prisma.payment.update({
          where: { id: order.payments[0].id },
          data: { reference: charge.providerReference, note: "Demande Orange Money envoyée sur le téléphone" },
        });
        order.payments[0].reference = charge.providerReference;
      }
    } catch (err) {
      reportError("orange-money", err);
    }
  }
  try {
    const settings = await getShopSettings().catch(() => null);
    const pay = paymentInstructions(settings)[network];
    after(() =>
      notifyCustomerAboutOrder({
        phone: order.shippingPhone,
        number: order.number,
        total: Number(order.total),
        sentence: "Nous avons reçu votre commande.",
        payCode: `${pay.code} (${pay.name})`,
      }),
    );
  } catch (err) {
    reportError("customer-whatsapp", err);
  }

  return order;
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  userId?: string;
  /** Cron : n’annule que si toujours PENDING et sans paiement COMPLETED. */
  unpaidOnly?: boolean;
}) {
  const locationId = await getDefaultLocationId();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: true, payments: true },
    });
    if (!order) throw new Error("Commande introuvable");
    if (input.unpaidOnly) {
      const paid = order.payments.some((p) => p.status === "COMPLETED");
      if (order.status !== "PENDING" || paid) {
        throw new Error("Commande déjà traitée ou payée.");
      }
    }
    return applyLockedOrderStatus(tx, order, input.status, input.userId, locationId);
  });
  if (!input.unpaidOnly && updated.shippingPhone) {
    const paid = updated.payments.some((p) => p.status === "COMPLETED") && updated.status !== "CANCELLED" && updated.status !== "REFUNDED";
    try {
      after(() =>
        notifyCustomerAboutOrder({
          phone: updated.shippingPhone,
          number: updated.number,
          total: Number(updated.total),
          sentence: customerStatusSentence(updated.status, paid),
        }),
      );
    } catch (err) {
      reportError("customer-whatsapp-status", err);
    }
  }
  return updated;
}

type LockedOrder = Prisma.OrderGetPayload<{ include: { items: true; payments: true } }>;

async function applyLockedOrderStatus(
  tx: Prisma.TransactionClient,
  order: LockedOrder,
  to: OrderStatus,
  userId: string | undefined,
  locationId: string,
) {
  const from = order.status;
  if (from === to) return order;
  if (!canTransitionOrder(from, to)) {
    throw new Error("Ce changement de statut n’est pas autorisé (risque de stock).");
  }

  const claimed = await tx.order.updateMany({
    where: { id: order.id, status: from },
    data: { status: to },
  });
  if (claimed.count !== 1) {
    throw new Error("Cette commande a déjà changé de statut.");
  }

  const effect = stockEffectForTransition(from, to);
  if (effect === "release") {
    for (const item of order.items) {
      await applyStockChange(tx, {
        variantId: item.variantId,
        locationId,
        type: "CANCELLATION",
        quantity: 0,
        reserveDelta: -item.quantity,
        userId,
        reference: order.number,
        comment: "Libération stock commande",
      });
    }
  } else if (effect === "restock") {
    for (const item of order.items) {
      await applyStockChange(tx, {
        variantId: item.variantId,
        locationId,
        type: "RETURN",
        quantity: item.quantity,
        userId,
        reference: order.number,
        comment: "Retour commande",
      });
    }
    if (order.customerId) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { totalSpent: { decrement: order.total } },
      });
    }
  } else if (effect === "ship") {
    for (const item of order.items) {
      await applyStockChange(tx, {
        variantId: item.variantId,
        locationId,
        type: "SALE_ONLINE",
        quantity: -item.quantity,
        reserveDelta: -item.quantity,
        userId,
        reference: order.number,
        comment: "Expédition / livraison commande",
      });
    }
    if (order.customerId) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { totalSpent: { increment: order.total }, lastPurchaseAt: new Date() },
      });
    }
  }

  if (to === "CANCELLED" || to === "REFUNDED") {
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "COMPLETED" },
      data: { status: "REFUNDED" },
    });
    if (releasesCouponOnStatus(to) && order.couponCode) {
      await tx.coupon.updateMany({
        where: { code: order.couponCode, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
  }

  await tx.auditLog.create({
    data: {
      userId: userId || undefined,
      action: "ORDER_STATUS",
      entity: "Order",
      entityId: order.id,
      before: { status: from },
      after: { status: to },
    },
  });

  return { ...order, status: to };
}

export async function collectCompletedOrderPayment(input: {
  orderId: string;
  userId: string;
  cashierName: string;
}) {
  const locationId = await getDefaultLocationId();
  const order = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
    const current = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: true, payments: true },
    });
    if (!current) throw new Error("Commande introuvable");
    const pending = current.payments.find((p) => p.status === "PENDING");
    if (!pending) throw new Error("Aucun paiement en attente sur cette commande");
    const claimedPay = await tx.payment.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: {
        status: "COMPLETED",
        note: `Encaissé par ${input.cashierName}`.trim(),
      },
    });
    if (claimedPay.count !== 1) throw new Error("Ce paiement a déjà été encaissé.");
    if (current.status === "PENDING") {
      await applyLockedOrderStatus(tx, current, "CONFIRMED", input.userId, locationId);
    }
    return current;
  });
  try {
    after(() =>
      notifyCustomerAboutOrder({
        phone: order.shippingPhone,
        number: order.number,
        total: Number(order.total),
        sentence: "Paiement reçu. Nous préparons votre commande.",
      }),
    );
  } catch (err) {
    reportError("customer-whatsapp-paid", err);
  }
  return order;
}

export async function releaseExpiredUnpaidOrders(now = new Date()) {
  const settings = await getShopSettings();
  const cutoff = unpaidOrderCutoff(now, settings.pendingOrderHours);
  if (!cutoff) return { cancelled: 0, hours: settings.pendingOrderHours };

  const orders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: cutoff },
      payments: { none: { status: "COMPLETED" } },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  let cancelled = 0;
  for (const order of orders) {
    try {
      await updateOrderStatus({ orderId: order.id, status: "CANCELLED", unpaidOnly: true });
      cancelled += 1;
    } catch {
      /* commande déjà traitée ou transition refusée */
    }
  }
  return { cancelled, hours: settings.pendingOrderHours, scanned: orders.length };
}

