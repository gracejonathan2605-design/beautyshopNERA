import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeShopSettings } from "../src/lib/settings";

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
    expect(merged.phone).toBe("+237 696565654");
    expect(merged.ticketFooter).toContain("Livraison rapide sous 24h");
    expect(merged.prefixes).toEqual(DEFAULT_SETTINGS.prefixes);
  });
});
