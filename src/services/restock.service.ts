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
    select: { product: { select: { variants: { select: { id: true }, take: 1 } } } },
    take: 30,
  });
  let sent = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    const variantId = row.product.variants[0]?.id;
    if (!variantId || seen.has(variantId)) continue;
    seen.add(variantId);
    const result = await notifyRestocksForVariant(variantId);
    sent += result.sent;
  }
  return { sent };
}
