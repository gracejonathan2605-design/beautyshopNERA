import { describe, expect, it } from "vitest";
import { defaultStaffPath, hasPermission } from "../src/lib/permissions";

describe("defaultStaffPath", () => {
  it("envoie un super admin vers /admin", () => {
    expect(defaultStaffPath({ isSuperAdmin: true, permissions: [] })).toBe("/admin");
  });

  it("envoie un caissier vers le POS", () => {
    const cashier = { permissions: ["pos.access", "sales.create"] };
    expect(hasPermission(cashier, "dashboard.view")).toBe(false);
    expect(defaultStaffPath(cashier)).toBe("/pos");
  });

  it("évite une boucle /admin pour un rôle sans tableau de bord", () => {
    const limited = { permissions: ["products.view"] };
    expect(hasPermission(limited, "dashboard.view")).toBe(false);
    expect(defaultStaffPath(limited)).toBe("/admin/produits");
    expect(defaultStaffPath({ permissions: ["orders.view"] })).toBe("/admin/commandes");
    expect(defaultStaffPath({ permissions: [] })).toBe("/admin/interdit");
  });
});
