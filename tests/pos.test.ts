import { describe, expect, it } from "vitest";
import {
  buildCheckoutPayments,
  clampDiscount,
  pickExactScanMatch,
  settlePosPayments,
  ticketTotals,
} from "../src/lib/pos";
import { defaultStockMoveComment, quantityForStockReason } from "../src/lib/stock-move";
import { ROLE_PRESETS } from "../src/lib/permissions";
import { isMissingHeldTicketStore } from "../src/services/held-ticket.service";

describe("remises caisse", () => {
  it("applique une remise ligne puis une remise ticket", () => {
    const totals = ticketTotals(
      [
        { unitPrice: 10000, quantity: 2, discount: 1000 },
        { unitPrice: 5000, quantity: 1, discount: 0 },
      ],
      2000,
    );
    expect(totals.subtotal).toBe(25000);
    expect(totals.lineDiscounts).toBe(1000);
    expect(totals.cartDiscount).toBe(2000);
    expect(totals.discountTotal).toBe(3000);
    expect(totals.total).toBe(22000);
  });

  it("plafonne la remise à la ligne", () => {
    expect(clampDiscount(99999, 4000)).toBe(4000);
    expect(ticketTotals([{ unitPrice: 2000, quantity: 1, discount: 8000 }], 0).total).toBe(0);
  });
});

describe("paiement mixte", () => {
  it("répartit espèces + MoMo et calcule la monnaie", () => {
    const split = buildCheckoutPayments({
      mixed: true,
      method: "CASH",
      total: 15000,
      cashAmount: 10000,
      momoAmount: null,
    });
    expect(split.payments).toEqual([
      { method: "CASH", amount: 10000 },
      { method: "MOBILE_MONEY", amount: 5000 },
    ]);
    expect(split.remaining).toBe(0);
    expect(split.change).toBe(0);
  });

  it("enregistre le cash dû, pas le trop-perçu", () => {
    const recorded = settlePosPayments(
      [
        { method: "CASH", amount: 12000 },
        { method: "MOBILE_MONEY", amount: 5000 },
      ],
      15000,
    );
    expect(recorded).toEqual([
      { method: "MOBILE_MONEY", amount: 5000 },
      { method: "CASH", amount: 10000 },
    ]);
  });

  it("refuse un MoMo supérieur au total", () => {
    expect(() =>
      settlePosPayments([{ method: "MOBILE_MONEY", amount: 20000 }], 15000),
    ).toThrow(/supérieur/);
  });

  it("plafonne le MoMo mixte trop élevé", () => {
    const split = buildCheckoutPayments({
      mixed: true,
      method: "CASH",
      total: 15000,
      cashAmount: 5000,
      momoAmount: 40000,
    });
    expect(split.payments.find((p) => p.method === "MOBILE_MONEY")?.amount).toBe(10000);
    expect(split.remaining).toBe(0);
  });
});

describe("scan code-barres", () => {
  it("prend le SKU ou le code-barres exact, pas un résultat flou", () => {
    const list = [
      { sku: "MEC-BW-18", barcode: "611000000001" },
      { sku: "GLOSS-01", barcode: null },
    ];
    expect(pickExactScanMatch(list, "611000000001")?.sku).toBe("MEC-BW-18");
    expect(pickExactScanMatch(list, "gloss-01")?.sku).toBe("GLOSS-01");
    expect(pickExactScanMatch(list, "ME")).toBeNull();
  });
});

describe("motifs de stock", () => {
  it("perd/donne en sortie et retourne en entrée", () => {
    expect(quantityForStockReason("LOSS", 3)).toBe(-3);
    expect(quantityForStockReason("DONATION", 2)).toBe(-2);
    expect(quantityForStockReason("RETURN", 4)).toBe(4);
    expect(quantityForStockReason("ADJUSTMENT", -1)).toBe(-1);
    expect(defaultStockMoveComment("LOSS")).toBe("Perte");
  });
});

describe("droits caisse", () => {
  it("autorise le caissier à rembourser depuis la caisse", () => {
    expect(ROLE_PRESETS.cashier).toContain("sales.refund");
    expect(ROLE_PRESETS.manager).toContain("sales.refund");
  });
});

describe("tickets en attente", () => {
  it("ne fait pas planter la caisse si le magasin de tickets manque", () => {
    expect(isMissingHeldTicketStore(new TypeError("heldTicket is undefined"))).toBe(true);
    expect(isMissingHeldTicketStore(new Error("Stock insuffisant"))).toBe(false);
  });
});
