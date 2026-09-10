import { describe, expect, it } from "vitest";
import { formatStaffOrderWhatsApp, paymentNetworkLabel, sendStaffOrderWhatsApp } from "../src/lib/order-alert";

describe("alerte WhatsApp commande site", () => {
  it("inclut nom, téléphone et chaque article", () => {
    const text = formatStaffOrderWhatsApp({
      number: "NERA-2026-00012",
      customerName: "Marie Client",
      customerPhone: "676935195",
      fulfillment: "DELIVERY",
      shippingAddress: "Ahala",
      shippingCity: "Yaoundé",
      paymentLabel: paymentNetworkLabel("MTN"),
      notes: "Appeler avant.",
      total: 52800,
      items: [
        { productName: "Gloss hydratant", quantity: 2, total: 7800 },
        { productName: "Mèche Body Wave", variantName: "18 pouces", quantity: 1, total: 45000 },
      ],
    });
    expect(text).toMatch(/COMMANDE SITE NERA/);
    expect(text).toMatch(/NERA-2026-00012/);
    expect(text).toMatch(/validée par le client/);
    expect(text).toMatch(/Marie Client/);
    expect(text).toMatch(/676935195/);
    expect(text).toMatch(/Gloss hydratant × 2/);
    expect(text).toMatch(/Mèche Body Wave \(18 pouces\) × 1/);
    expect(text).toMatch(/Livraison/);
    expect(text).toMatch(/Yaoundé/);
    expect(text).toMatch(/MTN MoMo/);
    expect(text).toMatch(/Appeler avant/);
  });

  it("indique un retrait boutique sans inventer d’adresse", () => {
    const text = formatStaffOrderWhatsApp({
      number: "NERA-1",
      customerName: "Awa",
      customerPhone: "690000000",
      fulfillment: "PICKUP",
      total: 3900,
      items: [{ productName: "Gloss hydratant", variantName: "Default", quantity: 1, total: 3900 }],
    });
    expect(text).toMatch(/Retrait en boutique/);
    expect(text).not.toMatch(/Livraison/);
    expect(text).not.toMatch(/Default/);
  });

  it("reconnaît Orange Money et le cash", () => {
    expect(paymentNetworkLabel("ORANGE")).toBe("Orange Money");
    expect(paymentNetworkLabel("CASH")).toBe("Espèces");
  });

  it("n’envoie rien si aucun canal WhatsApp n’est configuré", async () => {
    const keys = ["CALLMEBOT_APIKEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "ORDER_NOTIFY_WEBHOOK"] as const;
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    for (const key of keys) delete process.env[key];
    try {
      const result = await sendStaffOrderWhatsApp("test");
      expect(result.sent).toBe(false);
      expect(result.reason).toBe("not-configured");
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });
});
