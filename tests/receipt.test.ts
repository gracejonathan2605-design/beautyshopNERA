import { describe, expect, it } from "vitest";
import {
  buildReceiptText,
  normalizeWhatsAppPhone,
  saleToReceipt,
  whatsappReceiptUrl,
} from "../src/lib/receipt";

const shop = {
  name: "NERA Beauté & Shop",
  slogan: "Yaoundé",
  address: "Marché Central",
  city: "Yaoundé",
  phone: "690000000",
  ticketFooter: "Merci et à bientôt",
};

describe("ticket de caisse", () => {
  it("normalise un numéro camerounais pour WhatsApp", () => {
    expect(normalizeWhatsAppPhone("690 12 34 56")).toBe("237690123456");
    expect(normalizeWhatsAppPhone("0690123456")).toBe("237690123456");
    expect(normalizeWhatsAppPhone("237690123456")).toBe("237690123456");
  });

  it("construit un ticket texte pour imprimante 80 mm", () => {
    const data = saleToReceipt(
      {
        number: "POS-2026-0001",
        createdAt: new Date("2026-08-24T10:00:00Z"),
        subtotal: 10000,
        discount: 0,
        total: 10000,
        items: [{ productName: "Sérum", variantName: "30 ml", quantity: 1, unitPrice: 10000, total: 10000 }],
        payments: [{ method: "CASH", amount: 10000 }],
        cashier: { firstName: "Amina", lastName: "N." },
      },
      shop,
    );
    const text = buildReceiptText(data);
    expect(text).toContain("NERA");
    expect(text).toContain("POS-2026-0001");
    expect(text).toContain("TOTAL");
    expect(text).toContain("Espèces");
    expect(text).toContain("Merci et à bientôt");
  });

  it("ouvre WhatsApp avec le texte du ticket", () => {
    const url = whatsappReceiptUrl("Bonjour NERA", "690123456");
    expect(url).toContain("https://wa.me/237690123456");
    expect(url).toContain("Bonjour");
  });
});
