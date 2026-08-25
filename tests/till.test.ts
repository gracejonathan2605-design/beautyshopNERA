import { describe, expect, it } from "vitest";
import { summarizeTill } from "../src/lib/till";

describe("caisse du jour", () => {
  it("garde le fond d’ouverture et ajoute les ventes espèces", () => {
    const snap = summarizeTill({
      sessionId: "s1",
      openingFloat: 20000,
      sales: [
        {
          status: "COMPLETED",
          total: 15000,
          payments: [{ method: "CASH", status: "COMPLETED", amount: 15000 }],
        },
        {
          status: "COMPLETED",
          total: 5000,
          payments: [{ method: "MOBILE_MONEY", status: "COMPLETED", amount: 5000 }],
        },
      ],
      expenses: [],
    });
    expect(snap.openingFloat).toBe(20000);
    expect(snap.salesTotal).toBe(20000);
    expect(snap.cashSales).toBe(15000);
    expect(snap.otherSales).toBe(5000);
    expect(snap.netRevenue).toBe(20000);
    expect(snap.expectedCash).toBe(35000);
  });

  it("défalque les dépenses des recettes et des espèces", () => {
    const snap = summarizeTill({
      sessionId: "s1",
      openingFloat: 10000,
      sales: [
        {
          status: "COMPLETED",
          total: 30000,
          payments: [{ method: "CASH", status: "COMPLETED", amount: 30000 }],
        },
      ],
      expenses: [{ id: "e1", amount: 4000, description: "Taxi", categoryName: "Transport" }],
    });
    expect(snap.expensesTotal).toBe(4000);
    expect(snap.netRevenue).toBe(26000);
    expect(snap.expectedCash).toBe(36000);
  });

  it("compte un paiement mixte espèces + MoMo dans le tiroir", () => {
    const snap = summarizeTill({
      sessionId: "s1",
      openingFloat: 10000,
      sales: [
        {
          status: "COMPLETED",
          total: 15000,
          payments: [
            { method: "CASH", status: "COMPLETED", amount: 10000 },
            { method: "MOBILE_MONEY", status: "COMPLETED", amount: 5000 },
          ],
        },
      ],
      expenses: [],
    });
    expect(snap.cashSales).toBe(10000);
    expect(snap.otherSales).toBe(5000);
    expect(snap.expectedCash).toBe(20000);
  });

  it("retire du tiroir une vente remboursée", () => {
    const snap = summarizeTill({
      sessionId: "s1",
      openingFloat: 10000,
      sales: [
        {
          status: "REFUNDED",
          total: 8000,
          payments: [{ method: "CASH", status: "REFUNDED", amount: 8000 }],
        },
      ],
      expenses: [],
    });
    expect(snap.salesTotal).toBe(0);
    expect(snap.cashSales).toBe(0);
    expect(snap.expectedCash).toBe(10000);
  });
});
