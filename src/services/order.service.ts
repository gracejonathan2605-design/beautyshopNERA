import { after } from "next/server";
import { FulfillmentType, OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStockChange } from "@/services/inventory.service";
import { formatRef, nextSequence } from "@/lib/sequences";
import { getDefaultLocationId, getShopSettings } from "@/lib/settings";
import { notify } from "@/lib/audit";
import { notifyCustomerAboutOrder, notifyCustomerPaymentReceipt, notifyStaffNewOnlineOrder, paymentNetworkLabel } from "@/lib/order-alert";
import { customerStatusSentence } from "@/lib/order-timeline";
import { paymentInstructions, startMobileMoneyCharge } from "@/lib/payments/mobile-money";
import { orangePushWasSent } from "@/lib/payments/orange-money";
import { paymentAwaitsStaffCheck, paymentNoteIsRefusal } from "@/lib/payments/payment-help";
import { orangeNotifPath } from "@/lib/payments/orange-webhook";
import { absoluteUrl } from "@/lib/site-url";
import { reportError } from "@/lib/monitor";
import { canTransitionOrder, releasesCouponOnStatus, stockEffectForTransition } from "@/lib/order-flow";
import { unitPrice as priced } from "@/lib/pricing";
import { couponDiscountAmount, couponClaimFilter, explainCouponFailure, normalizeCouponCode } from "@/lib/coupon";
import { normalizeCartItems } from "@/lib/cart";
import { findCustomerByPhone, reduceCustomerSpend } from "@/services/customer.service";
import { shouldReleaseUnpaidOrder, unpaidOrderCutoff } from "@/lib/pending-orders";
import { rateLimit } from "@/lib/rate-limit";

const ORANGE_PUSH_NOTE = "Demande Orange Money envoyée sur le téléphone";
const ORANGE_PUSH_PENDING_PREFIX = "Demande Orange Money en cours";

function orangePushPendingAge(note: string | null) {
  if (!note?.startsWith(ORANGE_PUSH_PENDING_PREFIX)) return null;
  const stamp = Number(note.slice(ORANGE_PUSH_PENDING_PREFIX.length).trim());
  if (!Number.isFinite(stamp) || stamp < 1_000_000_000_000) return Number.POSITIVE_INFINITY;
  return Date.now() - stamp;
}

const BALANCE_SKIP = new Set(["not-configured", "invalid-phone", "amount"]);

/** Une seule alerte admin par refus. Une nouvelle tentative reste possible. */
export async function recordPaymentRefusal(input: {
  paymentId: string;
  orderNumber: string;
  network: "ORANGE" | "MTN";
  balance: boolean;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: { id: true, note: true, status: true },
  });
  if (!payment || payment.status !== "PENDING" || paymentNoteIsRefusal(payment.note)) return;
  const note =
    input.network === "MTN"
      ? "Paiement MTN refusé"
      : input.balance
        ? "Paiement refusé : solde insuffisant"
        : "Paiement Orange refusé";
  const saved = await prisma.payment.updateMany({
    where: { id: payment.id, status: "PENDING", note: payment.note },
    data: { note },
  });
  if (saved.count !== 1) return;
  const detail =
    input.network === "MTN"
      ? "MTN MoMo refusé"
      : input.balance
        ? "Orange Money refusé (solde insuffisant)"
        : "Orange Money refusé";
  try {
    await notify({
      type: "PAYMENT_REFUSED",
      title: "Paiement refusé",
      message: `Commande ${input.orderNumber} : ${detail}.`,
    });
  } catch (err) {
    reportError("payment-refused", err);
  }
}

/** Réserve le paiement puis déclenche l’encaissement automatique YNote (OM_CMR). */
export async function sendOrderOrangePush(input: {
  paymentId: string;
  amount: number;
  orderNumber: string;
  phone: string;
}): Promise<"sent" | "pending" | "failed" | "limited" | "manual"> {
  const current = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: { id: true, status: true, note: true, reference: true },
  });
  if (!current || current.status !== "PENDING") return "failed";
  if (orangePushWasSent(current)) return "sent";
  const pendingAge = orangePushPendingAge(current.note);
  if (pendingAge !== null && pendingAge < 45_000) return "pending";
  if (!rateLimit(`om-push:${current.id}`, 8, 10 * 60 * 1000)) return "limited";
  const claimed = await prisma.payment.updateMany({
    where: { id: current.id, status: "PENDING", note: current.note },
    data: { note: `${ORANGE_PUSH_PENDING_PREFIX} ${Date.now()}` },
  });
  if (claimed.count !== 1) return "pending";
  let declined = false;
  try {
    const charge = await startMobileMoneyCharge({
      network: "ORANGE",
      amount: input.amount,
      orderNumber: input.orderNumber,
      phone: input.phone,
      notifUrl: absoluteUrl(orangeNotifPath()),
    });
    if (charge.mode === "api" && charge.providerReference && charge.providerReference !== "ORANGE") {
      await prisma.payment.update({
        where: { id: current.id },
        data: { reference: charge.providerReference, note: ORANGE_PUSH_NOTE },
      });
      return "sent";
    }
    // Config absente, téléphone invalide ou panne : le client paie avec le code marchand.
    // Seul un refus explicite (hors repli) devient « paiement refusé ».
    const reason = charge.reason ?? "";
    declined = Boolean(reason && !BALANCE_SKIP.has(reason) && reason !== "orange-money");
  } catch (err) {
    reportError("orange-money", err);
  }
  await prisma.payment.updateMany({
    where: { id: current.id, note: { startsWith: ORANGE_PUSH_PENDING_PREFIX } },
    data: { note: pendingAge === null ? current.note : null },
  });
  if (declined) {
    await recordPaymentRefusal({
      paymentId: current.id,
      orderNumber: input.orderNumber,
      network: "ORANGE",
      balance: true,
    });
    return "failed";
  }
  return "manual";
}

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
    const free = total === 0;

    const created = await tx.order.create({
      data: {
        number,
        customerId: customerId ?? undefined,
        status: free ? "CONFIRMED" : "PENDING",
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
                status: free ? "COMPLETED" : "PENDING",
                note: free ? "Commande à 0 FCFA" : undefined,
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
  }, { maxWait: 10_000, timeout: 20_000 });

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
  let orangePush = false;
  if (order.payments[0] && order.total > 0 && network === "ORANGE") {
    const payment = order.payments[0];
    const chargePromise = sendOrderOrangePush({
      paymentId: payment.id,
      amount: Number(order.total),
      orderNumber: order.number,
      phone: order.shippingPhone ?? "",
    });
    orangePush = (await chargePromise) === "sent";
    if (orangePush) {
      payment.note = ORANGE_PUSH_NOTE;
    }
  } else if (order.payments[0] && order.total > 0) {
    try {
      const charge = await startMobileMoneyCharge({
        network,
        amount: Number(order.total),
        orderNumber: order.number,
        phone: order.shippingPhone ?? "",
      });
      if (charge.reason === "declined") {
        await recordPaymentRefusal({
          paymentId: order.payments[0].id,
          orderNumber: order.number,
          network: "MTN",
          balance: false,
        });
      }
    } catch (err) {
      reportError("mobile-money", err);
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

  return Object.assign(order, { orangePush });
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
    const counted = order.payments.some((payment) => payment.status === "COMPLETED") || order.total === 0;
    if (order.customerId && counted) {
      await reduceCustomerSpend(tx, order.customerId, order.total);
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
    const counted = order.payments.some((payment) => payment.status === "COMPLETED") || order.total === 0;
    if (order.customerId && counted) {
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
    } else if (
      (current.status === "SHIPPED" || current.status === "DELIVERED") &&
      current.customerId &&
      current.total > 0
    ) {
      await tx.customer.update({
        where: { id: current.customerId },
        data: { totalSpent: { increment: current.total }, lastPurchaseAt: new Date() },
      });
    }
    return current;
  });
  try {
    after(() =>
      notifyCustomerPaymentReceipt({
        phone: order.shippingPhone,
        number: order.number,
        total: Number(order.total),
        items: order.items.map((item) => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          total: Number(item.total),
        })),
      }),
    );
  } catch (err) {
    reportError("customer-whatsapp-paid", err);
  }
  return order;
}

const UNPAID_RELEASE_BATCH = 40;

/** Commandes encore en attente, sans paiement confirmé ni preuve client à vérifier. */
function expiredUnpaidWhere(cutoff: Date): Prisma.OrderWhereInput {
  return {
    status: "PENDING",
    total: { gt: 0 },
    createdAt: { lte: cutoff },
    AND: [
      { payments: { none: { status: "COMPLETED" } } },
      {
        payments: {
          none: {
            OR: [
              { proofUrl: { not: null } },
              { note: { contains: "Référence indiquée par le client" } },
              {
                AND: [
                  { reference: { not: null } },
                  { reference: { notIn: ["ORANGE", "MTN", ""] } },
                  { NOT: { reference: { startsWith: "MP" } } },
                ],
              },
            ],
          },
        },
      },
    ],
  };
}

export async function releaseExpiredUnpaidOrders(now = new Date()) {
  const settings = await getShopSettings();
  const cutoff = unpaidOrderCutoff(now, settings.pendingOrderHours);
  if (!cutoff) return { cancelled: 0, hours: settings.pendingOrderHours };

  let cancelled = 0;
  let scanned = 0;
  for (let round = 0; round < 4; round += 1) {
    const orders = await prisma.order.findMany({
      where: expiredUnpaidWhere(cutoff),
      select: {
        id: true,
        status: true,
        createdAt: true,
        total: true,
        payments: { select: { status: true, proofUrl: true, reference: true, note: true } },
      },
      orderBy: { createdAt: "asc" },
      take: UNPAID_RELEASE_BATCH,
    });
    if (!orders.length) break;
    scanned += orders.length;
    let progressed = 0;
    for (const order of orders) {
      const awaiting = order.payments.some((payment) => paymentAwaitsStaffCheck(payment));
      const paid = order.payments.some((payment) => payment.status === "COMPLETED");
      if (
        !shouldReleaseUnpaidOrder({
          status: order.status,
          createdAt: order.createdAt,
          cutoff,
          hasCompletedPayment: paid,
          awaitingStaffCheck: awaiting,
          total: order.total,
        })
      ) {
        continue;
      }
      try {
        await updateOrderStatus({ orderId: order.id, status: "CANCELLED", unpaidOnly: true });
        cancelled += 1;
        progressed += 1;
      } catch {
        /* commande déjà traitée ou transition refusée */
      }
    }
    if (orders.length < UNPAID_RELEASE_BATCH || progressed === 0) break;
  }
  return { cancelled, hours: settings.pendingOrderHours, scanned };
}

/** Anciennes commandes à 0 FCFA encore PENDING : les confirmer au lieu de les annuler. */
export async function confirmFreePendingOrders() {
  const locationId = await getDefaultLocationId();
  const orders = await prisma.order.findMany({
    where: { status: "PENDING", total: 0 },
    select: { id: true },
    take: UNPAID_RELEASE_BATCH,
  });
  let confirmed = 0;
  for (const row of orders) {
    try {
      const did = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${row.id} FOR UPDATE`;
        const current = await tx.order.findUnique({
          where: { id: row.id },
          include: { items: true, payments: true },
        });
        if (!current || current.status !== "PENDING" || current.total !== 0) return false;
        await tx.payment.updateMany({
          where: { orderId: current.id, status: "PENDING" },
          data: { status: "COMPLETED", note: "Commande à 0 FCFA" },
        });
        const refreshed = {
          ...current,
          payments: current.payments.map((payment) =>
            payment.status === "PENDING" ? { ...payment, status: "COMPLETED" as const } : payment,
          ),
        };
        await applyLockedOrderStatus(tx, refreshed, "CONFIRMED", undefined, locationId);
        return true;
      });
      if (did) confirmed += 1;
    } catch {
      /* déjà traitée */
    }
  }
  return { confirmed };
}

function systemCancelled(log: { userId: string | null; after: Prisma.JsonValue } | null) {
  if (!log || log.userId) return false;
  const after = log.after;
  if (!after || typeof after !== "object" || Array.isArray(after)) return false;
  return (after as { status?: string }).status === "CANCELLED";
}

/**
 * Orange (ou un autre opérateur déjà vérifié) confirme un paiement.
 * Si le cron a annulé la commande entre-temps, on la rouvre et on réserve à nouveau le stock.
 */
export async function confirmProviderPayment(input: { orderId: string; cashierName: string }) {
  const snapshot = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true, payments: { select: { status: true } } },
  });
  if (!snapshot) throw new Error("Commande introuvable");
  if (snapshot.payments.some((payment) => payment.status === "COMPLETED")) return { state: "paid" as const };
  if (snapshot.payments.some((payment) => payment.status === "PENDING")) {
    await collectCompletedOrderPayment({
      orderId: input.orderId,
      userId: "",
      cashierName: input.cashierName,
    });
    return { state: "paid" as const };
  }
  if (snapshot.status !== "CANCELLED") return { state: "ignored" as const };
  return reviveAutoCancelledOrder(input);
}

async function reviveAutoCancelledOrder(input: { orderId: string; cashierName: string }) {
  const locationId = await getDefaultLocationId();
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { items: true, payments: true },
      });
      if (!order || order.status !== "CANCELLED") return { state: "ignored" as const };
      if (order.payments.some((payment) => payment.status === "COMPLETED")) return { state: "paid" as const };
      const failed = order.payments.find((payment) => payment.status === "FAILED");
      if (!failed) return { state: "ignored" as const };
      const log = await tx.auditLog.findFirst({
        where: { entity: "Order", entityId: order.id, action: "ORDER_STATUS" },
        orderBy: { createdAt: "desc" },
      });
      if (!systemCancelled(log)) {
        await tx.payment.updateMany({
          where: { id: failed.id, status: "FAILED" },
          data: {
            status: "COMPLETED",
            note: `Payé après annulation manuelle (${input.cashierName})`,
          },
        });
        await tx.notification.create({
          data: {
            type: "PAYMENT_RECEIVED",
            title: "Paiement reçu sur commande annulée",
            message: `Commande ${order.number} a été payée après une annulation manuelle. Vérifiez avec le client.`,
          },
        });
        return { state: "ignored" as const };
      }

      let stockOk = true;
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { variantId_locationId: { variantId: item.variantId, locationId } },
        });
        const available = inventory ? inventory.onHand - inventory.reserved : 0;
        if (available < item.quantity) stockOk = false;
      }

      const claimed = await tx.payment.updateMany({
        where: { id: failed.id, status: "FAILED" },
        data: {
          status: "COMPLETED",
          note: stockOk
            ? `Encaissé par ${input.cashierName}`
            : `Payé après annulation — stock insuffisant (${input.cashierName})`,
        },
      });
      if (claimed.count !== 1) return { state: "ignored" as const };

      if (!stockOk) {
        await tx.notification.create({
          data: {
            type: "PAYMENT_RECEIVED",
            title: "Paiement reçu, stock insuffisant",
            message: `Commande ${order.number} payée après expiration, mais le stock ne permet pas de la rouvrir.`,
          },
        });
        return { state: "paid-without-stock" as const, order };
      }

      for (const item of order.items) {
        await applyStockChange(tx, {
          variantId: item.variantId,
          locationId,
          type: "SALE_ONLINE",
          quantity: 0,
          reserveDelta: item.quantity,
          reference: order.number,
          comment: "Réservation après paiement tardif",
        });
      }
      const reopened = await tx.order.updateMany({
        where: { id: order.id, status: "CANCELLED" },
        data: { status: "CONFIRMED" },
      });
      if (reopened.count !== 1) throw new Error("Cette commande a déjà changé de statut.");
      if (order.couponCode) {
        await tx.coupon.updateMany({
          where: { code: order.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }
      await tx.auditLog.create({
        data: {
          action: "ORDER_STATUS",
          entity: "Order",
          entityId: order.id,
          before: { status: "CANCELLED" },
          after: { status: "CONFIRMED", reason: "paiement tardif" },
        },
      });
      return { state: "paid" as const, order };
    },
    { maxWait: 10_000, timeout: 20_000 },
  );

  if (result.state === "paid" && "order" in result && result.order) {
    const revived = result.order;
    try {
      after(() =>
        notifyCustomerPaymentReceipt({
          phone: revived.shippingPhone,
          number: revived.number,
          total: Number(revived.total),
          items: revived.items.map((item) => ({
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            total: Number(item.total),
          })),
        }),
      );
    } catch (err) {
      reportError("customer-whatsapp-paid", err);
    }
  }
  return { state: result.state };
}

