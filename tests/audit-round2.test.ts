import { describe, expect, it } from "vitest";
import { unitPrice } from "../src/lib/pricing";
import { summarizeTill } from "../src/lib/till";
import { isValidOrderAccessToken, orderAccessToken, orderConfirmationPath } from "../src/lib/order-access";
import { safeNextPath } from "../src/lib/safe-path";

describe("prix promo", () => {
  it("ignore une promo à 0 ou supérieure au prix", () => {
    expect(unitPrice({ salePrice: 5000, promoPrice: 0 })).toBe(5000);
    expect(unitPrice({ salePrice: 5000, promoPrice: 5000 })).toBe(5000);
    expect(unitPrice({ salePrice: 5000, promoPrice: 4000 })).toBe(4000);
    expect(unitPrice({ salePrice: 5000, promoPrice: null })).toBe(5000);
  });
});

describe("caisse — trop-perçu espèces", () => {
  it("ne compte que le dû, pas le montant tendu", () => {
    const snap = summarizeTill({
      sessionId: "s1",
      openingFloat: 10000,
      sales: [
        {
          status: "COMPLETED",
          total: 7500,
          payments: [{ method: "CASH", status: "COMPLETED", amount: 10000 }],
        },
      ],
      expenses: [],
    });
    expect(snap.cashSales).toBe(7500);
    expect(snap.expectedCash).toBe(17500);
  });
});

describe("accès confirmation commande", () => {
  const secret = "test-order-secret";
  it("accepte uniquement le jeton HMAC", () => {
    const token = orderAccessToken("NERA-2026-000001", secret);
    expect(isValidOrderAccessToken("NERA-2026-000001", token, secret)).toBe(true);
    expect(isValidOrderAccessToken("NERA-2026-000001", "abc", secret)).toBe(false);
    expect(isValidOrderAccessToken("NERA-2026-000002", token, secret)).toBe(false);
    expect(orderConfirmationPath("NERA-2026-000001", secret)).toContain("t=");
  });
});

describe("login déjà connecté", () => {
  it("refuse //evil.com comme next", () => {
    expect(safeNextPath("//evil.com", "/pos")).toBe("/pos");
  });
});
