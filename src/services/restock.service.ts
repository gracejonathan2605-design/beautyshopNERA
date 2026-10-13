import { prisma } from "@/lib/prisma";
import { notifyCustomerAboutOrder } from "@/lib/order-alert";
import { variantAvailable } from "@/lib/stock-display";

export async function notifyRestocksForVariant(variantId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      productId: true,
      product: { select: { name: true, onlineVisible: true, status: true, deletedAt: true } },
      inventories: { select: { onHand: true, reserved: true } },
    },
  });
  if (!variant || variant.product.deletedAt || !variant.product.onlineVisible || variant.product.status !== "ACTIVE") {
    return { sent: 0 };
  }
  if (variantAvailable(variant.inventories) <= 0) return { sent: 0 };
  const waiting = await prisma.restockRequest.findMany({
    where: { productId: variant.productId, notifiedAt: null },
    take: 40,
  });
  let sent = 0;
  for (const row of waiting) {
    await notifyCustomerAboutOrder({
      phone: row.phone,
      number: variant.product.name,
      total: 0,
      sentence: `${variant.product.name} est de nouveau disponible chez NERA. Ouvrez la boutique pour commander.`,
    });
    await prisma.restockRequest.update({ where: { id: row.id }, data: { notifiedAt: new Date() } });
    sent += 1;
  }
  return { sent };
}

export async function notifyPendingRestocks() {
  const rows = await prisma.restockRequest.findMany({
    where: { notifiedAt: null },
    select: { productId: true, product: { select: { variants: { where: { deletedAt: null }, select: { id: true } } } } },
    take: 30,
  });
  let sent = 0;
  const seenProducts = new Set<string>();
  for (const row of rows) {
    if (seenProducts.has(row.productId)) continue;
    seenProducts.add(row.productId);
    // Une seule variante disponible suffit : notifyRestocksForVariant marque toutes les demandes du produit.
    for (const variant of row.product.variants) {
      const result = await notifyRestocksForVariant(variant.id);
      sent += result.sent;
      if (result.sent > 0) break;
    }
  }
  return { sent };
}
