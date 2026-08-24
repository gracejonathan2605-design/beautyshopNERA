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
});
