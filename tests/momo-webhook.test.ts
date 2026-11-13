import { describe, expect, it } from "vitest";
import { matchingMomoPayment, parseMomoWebhook } from "../src/lib/payments/momo-webhook";

describe("notification MTN MoMo", () => {
  const pending = [
    { id: "mtn-payment", provider: "MTN", status: "PENDING" },
    { id: "orange-payment", provider: "ORANGE", status: "PENDING" },
  ];

  it("exige un ordre, un statut et un montant entier exact", () => {
    expect(parseMomoWebhook({ orderNumber: "NERA-1", status: "COMPLETED", amount: 12500 })).toEqual({
      orderNumber: "NERA-1",
      amount: 12500,
    });
    expect(parseMomoWebhook({ orderNumber: "NERA-1", status: "COMPLETED" })).toBeNull();
    expect(parseMomoWebhook({ orderNumber: "NERA-1", status: "COMPLETED", amount: "12500" })).toBeNull();
    expect(parseMomoWebhook({ orderNumber: "NERA-1", status: "PENDING", amount: 12500 })).toBeNull();
  });

  it("ne valide que le paiement MTN en attente et au montant exact", () => {
    expect(matchingMomoPayment(12500, 12500, pending)?.id).toBe("mtn-payment");
    expect(matchingMomoPayment(12501, 12500, pending)).toBeNull();
    expect(matchingMomoPayment(12500, 12500, [pending[1]])).toBeNull();
    expect(
      matchingMomoPayment(12500, 12500, [{ ...pending[0], status: "COMPLETED" }]),
    ).toBeNull();
  });
});
