import { describe, expect, it } from "vitest";
import { canTransitionOrder, stockEffectForTransition } from "../src/lib/order-flow";
import { safeNextPath } from "../src/lib/safe-path";
import { summarizeTill } from "../src/lib/till";

describe("statuts commande", () => {
  it("interdit un retour arrière qui double le stock", () => {
    expect(canTransitionOrder("SHIPPED", "READY")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransitionOrder("READY", "SHIPPED")).toBe(true);
    expect(stockEffectForTransition("READY", "SHIPPED")).toBe("ship");
    expect(stockEffectForTransition("SHIPPED", "DELIVERED")).toBe("none");
    expect(stockEffectForTransition("DELIVERED", "REFUNDED")).toBe("restock");
  });
});

describe("redirection login", () => {
  it("refuse les chemins ouverts", () => {
    expect(safeNextPath("//evil.com", "/admin")).toBe("/admin");
    expect(safeNextPath("/pos", "/admin")).toBe("/pos");
    expect(safeNextPath("https://evil.com", "/admin")).toBe("/admin");
  });
});

describe("caisse", () => {
  it("ne retranche pas une vente déjà exclue des espèces", () => {
    const snap = summarizeTill({
      sessionId: "s1",
      openingFloat: 10000,
      sales: [
        {
          status: "CANCELLED",
          total: 5000,
          payments: [{ method: "CASH", status: "REFUNDED", amount: 5000 }],
        },
      ],
      expenses: [],
    });
    expect(snap.salesTotal).toBe(0);
    expect(snap.expectedCash).toBe(10000);
  });
});
