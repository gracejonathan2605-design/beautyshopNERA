import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { applyStockChange, availableQty } from "../src/services/inventory.service";
import { createPosSale } from "../src/services/sale.service";
import { hasPermission } from "../src/lib/permissions";

describe("stock", () => {
  it("diminue le stock après une vente POS", async () => {
    const variant = await prisma.productVariant.findFirstOrThrow({
      where: { sku: "MEC-BW-18" },
      include: { inventories: true },
    });
    const locationId = variant.inventories[0].locationId;
    const before = variant.inventories[0].onHand;
    const user = await prisma.user.findFirstOrThrow({ where: { email: "caisse@nerabeaute.cm" } });
    await createPosSale({
      cashierId: user.id,
      locationId,
      lines: [{ variantId: variant.id, quantity: 1 }],
      payments: [{ method: "CASH", amount: variant.promoPrice ?? variant.salePrice }],
    });
    const after = await prisma.inventory.findUniqueOrThrow({
      where: { variantId_locationId: { variantId: variant.id, locationId } },
    });
    expect(after.onHand).toBe(before - 1);
  });

  it("refuse un stock disponible négatif", async () => {
    const variant = await prisma.productVariant.findFirstOrThrow({ include: { inventories: true } });
    const inv = variant.inventories[0];
    await expect(
      prisma.$transaction((tx) =>
        applyStockChange(tx, {
          variantId: variant.id,
          locationId: inv.locationId,
          type: "SALE_POS",
          quantity: -(inv.onHand - inv.reserved + 1),
        }),
      ),
    ).rejects.toThrow();
  });

  it("calcule le disponible", () => {
    expect(availableQty(10, 3)).toBe(7);
  });
});

describe("permissions", () => {
  it("un caissier n'a pas les paramètres", async () => {
    const cashier = await prisma.user.findFirstOrThrow({
      where: { email: "caisse@nerabeaute.cm" },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const session = {
      isSuperAdmin: cashier.role.isSuperAdmin,
      permissions: cashier.role.permissions.map((p) => p.permission.code),
    };
    expect(hasPermission(session, "pos.access")).toBe(true);
    expect(hasPermission(session, "settings.update")).toBe(false);
    expect(hasPermission(session, "users.create")).toBe(false);
  });

  it("le super admin a tout", async () => {
    const admin = await prisma.user.findFirstOrThrow({
      where: { email: process.env.SEED_ADMIN_EMAIL ?? "raisaodin1@gmail.com" },
      include: { role: true },
    });
    expect(hasPermission({ isSuperAdmin: admin.role.isSuperAdmin, permissions: [] }, "users.delete")).toBe(true);
  });
});
