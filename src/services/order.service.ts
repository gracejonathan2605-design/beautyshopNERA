import { FulfillmentType, OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStockChange } from "@/services/inventory.service";
import { formatRef, nextSequence } from "@/lib/sequences";
import { getDefaultLocationId, getShopSettings } from "@/lib/settings";
import { notify } from "@/lib/audit";
import { canTransitionOrder, stockEffectForTransition } from "@/lib/order-flow";
import { unitPrice as priced } from "@/lib/pricing";
import { couponDiscountAmount, explainCouponFailure, normalizeCouponCode } from "@/lib/coupon";
import { normalizeCartItems } from "@/lib/cart";

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
        where: {
          id: coupon.id,
          ...(coupon.maxUses !== null ? { usedCount: { lt: coupon.maxUses } } : {}),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error("Ce code promo n’est plus disponible.");
    }

    const total = Math.max(0, subtotal - discount + shippingFee);

    const created = await tx.order.create({
      data: {
        number,
        customerId: input.customerId ?? undefined,
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

  await notify({
    type: "NEW_ORDER",
    title: "Nouvelle commande",
    message: `Commande ${order.number} — ${order.total} FCFA`,
  });

  return order;
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  userId: string;
}) {
  const locationId = await getDefaultLocationId();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Commande introuvable");
    const from = order.status;
    const to = input.status;
    if (from === to) return order;
    if (!canTransitionOrder(from, to)) {
      throw new Error("Ce changement de statut n’est pas autorisé (risque de stock).");
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
          userId: input.userId,
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
          userId: input.userId,
          reference: order.number,
          comment: "Retour commande",
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
          userId: input.userId,
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

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: to },
    });

    if (to === "CANCELLED" || to === "REFUNDED") {
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "COMPLETED" },
        data: { status: "REFUNDED" },
      });
      if (to === "CANCELLED" && order.couponCode) {
        await tx.coupon.updateMany({
          where: { code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "ORDER_STATUS",
        entity: "Order",
        entityId: order.id,
        before: { status: from },
        after: { status: to },
      },
    });

    return updated;
  });
}
