import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("œil mot de passe", () => {
  it("est branché sur les écrans de connexion et de modification", () => {
    for (const file of [
      "src/app/(shop)/compte/connexion/page.tsx",
      "src/app/login/page.tsx",
      "src/app/(shop)/compte/inscription/page.tsx",
      "src/components/shop/account-profile-form.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("PasswordField");
      expect(source).not.toMatch(/name="password" type="password"/);
    }
  });
});
