import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeShopSettings, toReceiptShop } from "../src/lib/settings";

describe("paramètres boutique", () => {
  it("complète RCCM, NUI, email et MoMo si la base n’a pas encore ces champs", () => {
    const merged = mergeShopSettings({
      name: "NERA Beauté & Shop",
      phone: "+237 696565654",
      email: "",
    });
    expect(merged.email).toBe("nerabeaute-shop@gmail.com");
    expect(merged.mtnPhone).toBe("676935195");
    expect(merged.rccm).toBe("CM-NSI-02-2026-B12-00534");
    expect(merged.nui).toBe("M062618760084L");
    expect(merged.phone).toBe("676 93 51 95");
    expect(merged.address).toBe("Marché Neptune Ahala, face Skymotors");
    expect(merged.slogan).toBe("Votre Beauté, notre Engagement ❤️");
    expect(merged.ticketFooter).toContain("Livraison rapide sous 24h");
    expect(merged.prefixes).toEqual(DEFAULT_SETTINGS.prefixes);
    expect(merged.flashDurationDays).toBe(10);
    expect(merged.pendingOrderHours).toBe(24);
  });

  it("conserve les identifiants Green API des alertes commande", () => {
    const merged = mergeShopSettings({
      greenApiId: "1103123",
      greenApiToken: "secret-token",
      greenApiUrl: "https://1103.api.green-api.com/",
      orderWhatsAppTo: "676 93 51 95",
    });
    expect(merged.greenApiId).toBe("1103123");
    expect(merged.greenApiToken).toBe("secret-token");
    expect(merged.greenApiUrl).toBe("https://1103.api.green-api.com");
    expect(merged.orderWhatsAppTo).toBe("676935195");
  });

  it("aligne les tickets POS sur le NAP officiel même si la base a l’ancien numéro", () => {
    const shop = toReceiptShop(
      mergeShopSettings({
        phone: "+237 696565654",
        address: "Marché Central",
        slogan: "Beauté, cheveux & mode — Yaoundé",
      }),
    );
    expect(shop.phone).toBe("676 93 51 95");
    expect(shop.address).toBe("Marché Neptune Ahala, face Skymotors");
    expect(shop.name).toBe("NERA Beauté & Shop");
  });

  it("normalise une durée Flash invalide vers 10 jours", () => {
    expect(mergeShopSettings({ flashDurationDays: 0 }).flashDurationDays).toBe(10);
    expect(mergeShopSettings({ flashDurationDays: 15 }).flashDurationDays).toBe(15);
  });

  it("normalise le délai de libération des commandes impayées", () => {
    expect(mergeShopSettings({ pendingOrderHours: 0 }).pendingOrderHours).toBe(0);
    expect(mergeShopSettings({ pendingOrderHours: 36 }).pendingOrderHours).toBe(36);
    expect(mergeShopSettings({ pendingOrderHours: -4 }).pendingOrderHours).toBe(24);
  });

  it("nettoie un collage Green API avec libellés", () => {
    const merged = mergeShopSettings({
      greenApiId: "idInstance: 1103999",
      greenApiToken: "apiTokenInstance: secret-token",
      greenApiUrl: "apiUrl: https://1103.api.green-api.com/",
    });
    expect(merged.greenApiId).toBe("1103999");
    expect(merged.greenApiToken).toBe("secret-token");
    expect(merged.greenApiUrl).toBe("https://1103.api.green-api.com");
  });
});
