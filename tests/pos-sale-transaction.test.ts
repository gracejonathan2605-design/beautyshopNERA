import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  applyStockChange: vi.fn(),
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/services/inventory.service", () => ({ applyStockChange: mocks.applyStockChange }));
vi.mock("@/lib/settings", () => ({ getShopSettings: vi.fn().mockResolvedValue({ prefixes: { sale: "POS" } }) }));
vi.mock("@/lib/sequences", () => ({
  nextSequence: vi.fn().mockResolvedValue({ year: 2026, value: 1 }),
  formatRef: vi.fn().mockReturnValue("POS-2026-000001"),
}));
vi.mock("@/lib/audit", () => ({ writeAudit: mocks.writeAudit }));

import { createPosSale } from "../src/services/sale.service";

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("transaction d’encaissement", () => {
  it("termine une vente même si la mise à jour du stock dépasse cinq secondes", async () => {
    vi.useFakeTimers();
    const sale = { id: "sale-1", number: "POS-2026-000001", total: 7000 };
    const tx = {
      productVariant: {
        findMany: vi.fn().mockResolvedValue([
          { id: "variant-1", name: "Default", sku: "SKU", salePrice: 5000, promoPrice: null, product: { name: "Sérum" } },
        ]),
      },
      inventory: { findUnique: vi.fn().mockResolvedValue({ onHand: 3, reserved: 0 }) },
      sale: { create: vi.fn().mockResolvedValue(sale) },
    };
    mocks.applyStockChange.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5086)));
    mocks.writeAudit.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (run, options?: { timeout?: number }) => {
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Transaction expirée")), options?.timeout ?? 5000);
      });
      try {
        return await Promise.race([run(tx), timeout]);
      } finally {
        clearTimeout(timeoutId!);
      }
    });

    const result = createPosSale({
      cashierId: "cashier-1",
      locationId: "location-1",
      lines: [{ variantId: "variant-1", quantity: 1, unitPrice: 7000 }],
      payments: [{ method: "CASH", amount: 7000 }],
    });
    await vi.advanceTimersByTimeAsync(5086);
    await expect(result).resolves.toEqual(sale);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 10_000, timeout: 20_000 });
    expect(mocks.applyStockChange).toHaveBeenCalledOnce();
    expect(tx.sale.create.mock.calls[0][0].data.total).toBe(7000);
  });
});
