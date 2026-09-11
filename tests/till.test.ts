import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { applyTillExpense, canCloseCashSession, cashReturnTillExpenseAmount, nextOpeningFloatFromClose, summarizeTill } from "../src/lib/till";

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


describe("remboursement hors session ouverte", () => {
  it("n’ajoute pas de sortie si la session d’origine est encore ouverte", () => {
    expect(cashReturnTillExpenseAmount(8000, "OPEN")).toBe(0);
  });

  it("demande une sortie d’espèces si la session d’origine est fermée", () => {
    expect(cashReturnTillExpenseAmount(8000, "CLOSED")).toBe(8000);
    expect(cashReturnTillExpenseAmount(5000, null)).toBe(5000);
    expect(cashReturnTillExpenseAmount(0, "CLOSED")).toBe(0);
  });
});

describe("ouvrir et fermer à tout moment", () => {
  it("autorise la fermeture par la vendeuse ou l’admin", () => {
    expect(canCloseCashSession({ openedById: "a", userId: "a" })).toBe(true);
    expect(canCloseCashSession({ openedById: "a", userId: "b" })).toBe(false);
    expect(canCloseCashSession({ openedById: "a", userId: "b", isSuperAdmin: true })).toBe(true);
  });

  it("reprend l’argent du tiroir comme fond de la prochaine ouverture", () => {
    expect(nextOpeningFloatFromClose({ actualCash: 42000, expectedCash: 40000 })).toBe(42000);
    expect(nextOpeningFloatFromClose({ actualCash: null, expectedCash: 40000 })).toBe(40000);
    expect(nextOpeningFloatFromClose({})).toBe(0);
  });

  it("défalque une dépense des espèces attendues tout de suite", () => {
    const snap = summarizeTill({
      sessionId: "s1",
      openingFloat: 10000,
      sales: [
        {
          status: "COMPLETED",
          total: 15000,
          payments: [{ method: "CASH", status: "COMPLETED", amount: 15000 }],
        },
      ],
      expenses: [],
    });
    const next = applyTillExpense(snap, {
      id: "e1",
      amount: 2000,
      description: "Taxi",
      categoryName: "Transport",
    });
    expect(next.expensesTotal).toBe(2000);
    expect(next.netRevenue).toBe(13000);
    expect(next.expectedCash).toBe(23000);
    expect(next.expenses[0]?.description).toBe("Taxi");
  });

  it("envoie la dépense sur la session ouverte, pas par redirection", () => {
    const form = readFileSync("src/components/pos/till-expense-form.tsx", "utf8");
    const action = readFileSync("src/app/actions/pos.ts", "utf8");
    expect(form).toContain('name="sessionId"');
    expect(form).toContain("submitTillExpense");
    expect(action).toContain("submitTillExpense");
    expect(action).toMatch(/return \{\s*ok: true/);
  });

  it("ferme sans attendre la fin de journée et affiche le résultat", () => {
    const board = readFileSync("src/components/pos/till-board.tsx", "utf8");
    const pos = readFileSync("src/components/pos/pos-client.tsx", "utf8");
    expect(board).toContain('name="sessionId"');
    expect(board).toMatch(/n’importe quelle heure|n'importe quelle heure/);
    expect(board).toContain("Fermer la caisse maintenant");
    expect(pos).toContain("autant de fois que besoin dans la");
    expect(pos).not.toMatch(/ce matin/);
    expect(readFileSync("src/components/pos/till-close-recap.tsx", "utf8")).toContain("Dernière fermeture");
  });
});
