import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sales: vi.fn(),
  orders: vi.fn(),
  expenses: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sale: { findMany: mocks.sales },
    order: { findMany: mocks.orders },
    expense: { findMany: mocks.expenses },
  },
}));

import { getSalesProfitReport } from "../src/services/reports.service";

describe("rapport des ventes", () => {
  it("sélectionne les ventes terminées, les commandes expédiées ou livrées et les remboursements correspondants", async () => {
    const date = new Date("2026-11-02T10:00:00Z");
    const range = { from: date, to: date };
    mocks.sales.mockResolvedValueOnce([{
      createdAt: date, total: 7000,
      items: [{ quantity: 1, unitCost: 3000, variant: { costPrice: 5000, product: { stockOwner: "NERA" } } }],
    }]).mockResolvedValueOnce([{ number: "POS-1" }]);
    mocks.orders.mockResolvedValueOnce([]);
    mocks.expenses.mockResolvedValueOnce([
      { date, amount: 7000, description: "Remboursement POS-1", cashSessionId: "caisse", category: { slug: "autre" } },
    ]);

    const report = await getSalesProfitReport(range);
    expect(report.totals.profit).toBe(4000);
    expect(mocks.sales.mock.calls[0][0].where).toEqual({ status: "COMPLETED", createdAt: { gte: date, lte: date } });
    expect(mocks.orders.mock.calls[0][0].where.status.in).toEqual(["SHIPPED", "DELIVERED"]);
    expect(mocks.sales.mock.calls[1][0].where).toEqual({
      number: { in: ["POS-1"] }, status: { in: ["CANCELLED", "REFUNDED"] },
    });
  });
});
