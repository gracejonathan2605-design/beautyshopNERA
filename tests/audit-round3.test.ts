import { describe, expect, it } from "vitest";
import { mergeSaleLines } from "../src/lib/pos";
import { shouldReleaseUnpaidOrder } from "../src/lib/pending-orders";
import { paymentAwaitsStaffCheck } from "../src/lib/payments/payment-help";
import { orangePushCustomerNotice } from "../src/lib/payments/orange-money";

const cutoff = new Date("2026-08-25T12:00:00Z");
const createdAt = new Date("2026-08-25T11:00:00Z");

describe("commandes à ne pas annuler toutes seules", () => {
  it("garde une commande dont le client a déjà envoyé une preuve", () => {
    expect(
      shouldReleaseUnpaidOrder({
        status: "PENDING",
        createdAt,
        cutoff,
        hasCompletedPayment: false,
        awaitingStaffCheck: true,
      }),
    ).toBe(false);
  });

  it("ne traite pas une commande à 0 FCFA comme impayée", () => {
    expect(
      shouldReleaseUnpaidOrder({
        status: "PENDING",
        createdAt,
        cutoff,
        hasCompletedPayment: false,
        total: 0,
      }),
    ).toBe(false);
  });

  it("reconnaît une preuve client, pas le jeton Orange", () => {
    expect(paymentAwaitsStaffCheck({ proofUrl: "https://cdn.example/preuve.webp" })).toBe(true);
    expect(paymentAwaitsStaffCheck({ reference: "TX-9988" })).toBe(true);
    expect(paymentAwaitsStaffCheck({ note: "Référence indiquée par le client : 123" })).toBe(true);
    expect(paymentAwaitsStaffCheck({ reference: "ORANGE" })).toBe(false);
    expect(paymentAwaitsStaffCheck({ reference: "MP2203.123" })).toBe(false);
  });
});

describe("Orange Money", () => {
  it("ne présente pas une panne d’envoi comme un solde vide", () => {
    expect(orangePushCustomerNotice("manual", "api")).toMatch(/code marchand/);
    expect(orangePushCustomerNotice("manual", "api")).not.toMatch(/pas assez d’argent/);
    expect(orangePushCustomerNotice("manual", "manual")).toBe("");
    expect(orangePushCustomerNotice("failed", "api")).toMatch(/pas assez d’argent/);
    expect(orangePushCustomerNotice("sent", "api")).toBe("");
  });
});

describe("caisse", () => {
  it("fusionne deux lignes de la même variante", () => {
    expect(
      mergeSaleLines([
        { variantId: "a", quantity: 1, discount: 100 },
        { variantId: "a", quantity: 2, discount: 50 },
        { variantId: "b", quantity: 1 },
      ]),
    ).toEqual([
      { variantId: "a", quantity: 3, discount: 150 },
      { variantId: "b", quantity: 1 },
    ]);
  });
});
