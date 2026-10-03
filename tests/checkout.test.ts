import { describe, expect, it } from "vitest";
import { billableLineQuantity, cartPayableTotal, nextCartQuantity, reorderCartMerge } from "../src/lib/cart";
import { analyticsCookieAssignment, parseAnalyticsCookie } from "../src/lib/analytics";
import { isShopTabActive } from "../src/lib/shop-nav";
import { catalogPhotoFor, PRODUCT_PHOTOS } from "../src/lib/product-photos";
import { readFileSync } from "node:fs";
import {
  MANUAL_PAYMENT_HINT,
  PAYMENT_INSTRUCTIONS,
  payableTotal,
  shippingFeeFor,
} from "../src/lib/checkout";

describe("photos catalogue", () => {
  it("associe chaque produit seed à une photo réelle", () => {
    expect(PRODUCT_PHOTOS["parfum-femme-nera-or"]).toContain("/products/");
    expect(catalogPhotoFor("meche-bresilienne-body-wave")).toBe("/products/hair-body-wave.jpg");
    expect(catalogPhotoFor("nouveau-gloss", "Gloss rose")).toBeNull();
    expect(catalogPhotoFor("savon-karite", "Savon")).toBeNull();
  });
});

describe("total commande", () => {
  it("n’ajoute pas de frais au retrait boutique", () => {
    expect(shippingFeeFor("PICKUP", 2500)).toBe(0);
    expect(payableTotal(10000, 0, 0)).toBe(10000);
  });

  it("soustrait une remise avant d’ajouter la livraison", () => {
    expect(payableTotal(20000, 2000, 2500)).toBe(20500);
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

  it("ne promet une demande sur le téléphone que pour un push Orange réel", () => {
    expect(MANUAL_PAYMENT_HINT).toMatch(/code ou le numéro/);
    const checkout = readFileSync("src/components/shop/checkout-form.tsx", "utf8");
    const confirmation = readFileSync("src/app/(shop)/commande/[number]/page.tsx", "utf8");
    expect(checkout).toContain("MANUAL_PAYMENT_HINT");
    expect(checkout).not.toContain("Une demande arrive sur votre téléphone");
    expect(confirmation).not.toContain("Une demande arrive sur votre téléphone");
    expect(confirmation).toContain("OrangePayLaunch");
    expect(confirmation).toContain("orangePushWasSent");
    expect(readFileSync("src/components/shop/orange-pay-launch.tsx", "utf8")).toContain("Lancer Orange Money");
    expect(readFileSync("src/lib/payments/orange-money.ts", "utf8")).toContain('startsWith("MP")');
    expect(readFileSync("src/app/actions/shop.ts", "utf8")).toContain("lancer=1");
  });
});

describe("plafond de stock au panier", () => {
  it("signale qu’on ne peut plus augmenter une quantité déjà au maximum", () => {
    expect(nextCartQuantity(2, 1, 2)).toEqual({ ok: true, quantity: 2, capped: true });
    expect(nextCartQuantity(1, 1, 3)).toEqual({ ok: true, quantity: 2, capped: false });
    expect(nextCartQuantity(0, 1, 0).ok).toBe(false);
  });

  it("ne traite pas un article déjà au maximum comme une rupture", () => {
    const merged = reorderCartMerge(
      [{ variantId: "a", quantity: 2 }],
      [
        { variantId: "a", quantity: 1 },
        { variantId: "b", quantity: 1 },
      ],
      (id) => (id === "a" ? 2 : 0),
    );
    expect(merged.added).toBe(0);
    expect(merged.already).toBe(1);
    expect(merged.skipped).toBe(1);
    expect(merged.cart).toEqual([{ variantId: "a", quantity: 2 }]);
  });
});

describe("total commandable du panier", () => {
  it("ignore les quantités au-delà du stock et les ruptures", () => {
    expect(billableLineQuantity(5, 2)).toBe(2);
    expect(billableLineQuantity(3, 0)).toBe(0);
    expect(
      cartPayableTotal([
        { unitPrice: 1000, quantity: 5, available: 2 },
        { unitPrice: 4000, quantity: 1, available: 0 },
        { unitPrice: 500, quantity: 2, available: 2 },
      ]),
    ).toBe(3000);
  });
});

describe("bandeau de mesure d’audience", () => {
  it("ne reconnaît que un accord ou un refus explicite", () => {
    expect(parseAnalyticsCookie("")).toBeNull();
    expect(parseAnalyticsCookie("nera_analytics=granted")).toBe("granted");
    expect(parseAnalyticsCookie("autre=1; nera_analytics=denied")).toBe("denied");
    expect(parseAnalyticsCookie("nera_analytics=maybe")).toBeNull();
    expect(analyticsCookieAssignment("granted", true)).toContain("max-age=15552000");
    expect(analyticsCookieAssignment("denied", false)).not.toContain("secure");
  });
});

describe("onglet boutique", () => {
  it("reste actif sur une fiche, une catégorie, le flash et les marques", () => {
    expect(isShopTabActive("/boutique", "/produit/gloss")).toBe(true);
    expect(isShopTabActive("/boutique", "/categorie/cheveux")).toBe(true);
    expect(isShopTabActive("/boutique", "/flash")).toBe(true);
    expect(isShopTabActive("/boutique", "/marques")).toBe(true);
    expect(isShopTabActive("/", "/produit/gloss")).toBe(false);
    expect(isShopTabActive("/compte", "/compte/connexion")).toBe(true);
    expect(isShopTabActive("/boutique", "/compte")).toBe(false);
  });
});
