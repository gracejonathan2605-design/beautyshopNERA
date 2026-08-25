import { FulfillmentType, OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStockChange } from "@/services/inventory.service";
import { formatRef, nextSequence } from "@/lib/sequences";
import { getDefaultLocationId, getShopSettings } from "@/lib/settings";
import { notify } from "@/lib/audit";
import { canTransitionOrder, stockEffectForTransition } from "@/lib/order-flow";

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
      where: { id: { in: input.lines.map((l) => l.variantId) } },
      include: { product: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    const items: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new Error("Quantité invalide");
      }
      const variant = byId.get(line.variantId);
      if (!variant || !variant.isActive || variant.deletedAt || !variant.product.onlineVisible) {
        throw new Error("Produit indisponible en ligne");
      }
      if (variant.product.status !== "ACTIVE") throw new Error("Produit indisponible");
      const unitPrice = variant.promoPrice ?? variant.salePrice;
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
    if (input.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } });
      const now = new Date();
      if (
        !coupon ||
        !coupon.isActive ||
        (coupon.startAt && coupon.startAt > now) ||
        (coupon.endAt && coupon.endAt < now) ||
        (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) ||
        subtotal < coupon.minAmount
      ) {
        throw new Error("Coupon invalide");
      }
      discount =
        coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
      const claimed = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          ...(coupon.maxUses !== null ? { usedCount: { lt: coupon.maxUses } } : {}),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error("Coupon invalide");
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
        couponCode: input.couponCode?.toUpperCase(),
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

    for (const line of input.lines) {
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
