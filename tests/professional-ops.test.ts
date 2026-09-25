import { describe, expect, it } from "vitest";
import { splitPartnerAmounts } from "../src/lib/partner-settlement";
import { customerStepIndex } from "../src/lib/order-timeline";
import { rateLimit, resetRateLimit } from "../src/lib/rate-limit";
import { paymentInstructions } from "../src/lib/payments/mobile-money";

describe("relevé partenaire", () => {
  it("calcule la commission sur le chiffre encaissé", () => {
    expect(
      splitPartnerAmounts({
        partnershipType: "COMMISSION",
        commissionBps: 2000,
        lines: [{ quantity: 1, revenue: 10000, cost: 4000 }],
      }),
    ).toMatchObject({ brandShare: 2000, neraShare: 8000, gross: 10000 });
  });

  it("reverse le prix de dépôt en dépôt-vente", () => {
    expect(
      splitPartnerAmounts({
        partnershipType: "CONSIGNMENT",
        commissionBps: 0,
        lines: [{ quantity: 2, revenue: 15000, cost: 6000 }],
      }).brandShare,
    ).toBe(6000);
  });

  it("ne reverse rien sur un achat en gros déjà payé", () => {
    const row = splitPartnerAmounts({
      partnershipType: "WHOLESALE",
      commissionBps: 0,
      lines: [{ quantity: 1, revenue: 8000, cost: 3000 }],
    });
    expect(row.brandShare).toBe(0);
    expect(row.neraShare).toBe(5000);
  });
});

describe("suivi commande", () => {
  it("place une commande payée en préparation", () => {
    expect(customerStepIndex("PREPARING", true)).toBe(2);
    expect(customerStepIndex("PENDING", false)).toBe(0);
    expect(customerStepIndex("CANCELLED", false)).toBe(-1);
  });
});

describe("limite de débit", () => {
  it("bloque après le quota", () => {
    resetRateLimit("demo");
    expect(rateLimit("demo", 2, 1000, 1)).toBe(true);
    expect(rateLimit("demo", 2, 1000, 2)).toBe(true);
    expect(rateLimit("demo", 2, 1000, 3)).toBe(false);
  });
});

describe("instructions Mobile Money", () => {
  it("reprend les codes enregistrés dans les paramètres", () => {
    const rows = paymentInstructions({
      orangeMerchantCode: "#150*1#",
      orangeMerchantName: "NERA",
      mtnPhone: "670000000",
      mtnAccountName: "Boutique",
    });
    expect(rows.ORANGE.code).toBe("#150*1#");
    expect(rows.MTN.name).toBe("Boutique");
    expect(rows.ORANGE.mode).toBe("manual");
  });
});
