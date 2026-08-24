import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/audit";

export function availableQty(onHand: number, reserved: number) {
  return onHand - reserved;
}

async function raiseStockAlerts(tx: Prisma.TransactionClient, variantId: string, locationId: string) {
  const inventory = await tx.inventory.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
    include: { variant: { include: { product: true } } },
  });
  if (!inventory) return;
  const available = availableQty(inventory.onHand, inventory.reserved);
  if (available <= 0) {
    await tx.notification.create({
      data: {
        type: "STOCK_OUT",
        title: "Rupture de stock",
        message: `${inventory.variant.product.name} — ${inventory.variant.name} n'a plus de stock disponible.`,
      },
    });
  } else if (available <= inventory.minQuantity) {
    await tx.notification.create({
      data: {
        type: "STOCK_LOW",
        title: "Stock faible",
        message: `${inventory.variant.product.name} — ${inventory.variant.name} : ${available} unité(s) restante(s).`,
      },
    });
  }
}

export async function applyStockChange(
  tx: Prisma.TransactionClient,
  input: {
    variantId: string;
    locationId: string;
    type: StockMovementType;
    quantity: number;
    userId?: string | null;
    supplierId?: string | null;
    reference?: string | null;
    comment?: string | null;
    reserveDelta?: number;
  },
) {
  if (input.quantity === 0 && !input.reserveDelta) {
    throw new Error("Quantité nulle");
  }

  await tx.inventory.upsert({
    where: { variantId_locationId: { variantId: input.variantId, locationId: input.locationId } },
    create: {
      variantId: input.variantId,
      locationId: input.locationId,
      onHand: 0,
      reserved: 0,
      minQuantity: 3,
    },
    update: {},
  });

  const inventory = await tx.inventory.findUniqueOrThrow({
    where: { variantId_locationId: { variantId: input.variantId, locationId: input.locationId } },
  });

  const nextOnHand = inventory.onHand + input.quantity;
  const nextReserved = inventory.reserved + (input.reserveDelta ?? 0);
  if (nextOnHand < 0) throw new Error("Stock physique insuffisant");
  if (nextReserved < 0) throw new Error("Stock réservé incohérent");
  if (nextOnHand - nextReserved < 0) throw new Error("Stock disponible insuffisant");

  const updated = await tx.$executeRaw`
    UPDATE "Inventory"
    SET "onHand" = "onHand" + ${input.quantity},
        "reserved" = "reserved" + ${input.reserveDelta ?? 0},
        "updatedAt" = NOW()
    WHERE "id" = ${inventory.id}
      AND "onHand" + ${input.quantity} >= 0
      AND "reserved" + ${input.reserveDelta ?? 0} >= 0
      AND ("onHand" + ${input.quantity}) - ("reserved" + ${input.reserveDelta ?? 0}) >= 0
  `;
  if (updated !== 1) {
    throw new Error("Stock insuffisant ou déjà modifié par une autre opération");
  }

  if (input.quantity !== 0) {
    await tx.stockMovement.create({
      data: {
        variantId: input.variantId,
        locationId: input.locationId,
        type: input.type,
        quantity: input.quantity,
        userId: input.userId ?? undefined,
        supplierId: input.supplierId ?? undefined,
        reference: input.reference ?? undefined,
        comment: input.comment ?? undefined,
      },
    });
  }

  await raiseStockAlerts(tx, input.variantId, input.locationId);
}

export async function receivePurchase(input: {
  variantId: string;
  locationId: string;
  quantity: number;
  userId: string;
  supplierId?: string;
  comment?: string;
  reference?: string;
}) {
  if (input.quantity <= 0) throw new Error("La quantité doit être positive");
  return prisma.$transaction((tx) =>
    applyStockChange(tx, {
      ...input,
      type: "PURCHASE",
      quantity: input.quantity,
    }),
  );
}

export async function adjustStock(input: {
  variantId: string;
  locationId: string;
  quantity: number;
  userId: string;
  type: Extract<StockMovementType, "ADJUSTMENT" | "LOSS" | "DONATION">;
  comment?: string;
}) {
  if (input.quantity === 0) throw new Error("Quantité nulle");
  return prisma.$transaction((tx) =>
    applyStockChange(tx, {
      ...input,
      quantity: input.quantity,
    }),
  );
}

export { notify };
