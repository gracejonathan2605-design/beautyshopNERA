import { describe, expect, it } from "vitest";
import { catalogPhotoFor, PRODUCT_PHOTOS } from "../src/lib/product-photos";
import {
  PAYMENT_INSTRUCTIONS,
  payableTotal,
  shippingFeeFor,
} from "../src/lib/checkout";

describe("photos catalogue", () => {
  it("associe chaque produit seed à une photo réelle", () => {
    expect(PRODUCT_PHOTOS["parfum-femme-nera-or"]).toContain("/products/");
    expect(catalogPhotoFor("meche-bresilienne-body-wave")).toBe("/products/hair-body-wave.jpg");
    expect(catalogPhotoFor("nouveau-gloss", "Gloss rose")).toBe("/products/gloss.jpg");
  });
});

describe("total commande", () => {
  it("n’ajoute pas de frais au retrait boutique", () => {
    expect(shippingFeeFor("PICKUP", 2500)).toBe(0);
    expect(payableTotal(10000, 0, 0)).toBe(10000);
  });

  it("ajoute les frais de livraison une seule fois au total", () => {
    expect(shippingFeeFor("DELIVERY", 2500)).toBe(2500);
    expect(payableTotal(10000, 0, 2500)).toBe(12500);
  });

  it("affiche le code marchand Orange Money sans frais", () => {
    expect(PAYMENT_INSTRUCTIONS.ORANGE.code).toBe("#150*47*1059897#");
    expect(PAYMENT_INSTRUCTIONS.ORANGE.name).toBe("YORIX DIGITAL GROUP CM");
    expect(PAYMENT_INSTRUCTIONS.ORANGE.detail.toLowerCase()).toContain("sans frais");
  });

  it("demande un transfert MTN vers Kouekam Raisa", () => {
    expect(PAYMENT_INSTRUCTIONS.MTN.code).toBe("676935195");
    expect(PAYMENT_INSTRUCTIONS.MTN.name).toBe("Kouekam Raisa");
  });
});
