import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shopPublicError } from "../src/lib/shop-public-error";

describe("messages d’erreur grand public", () => {
  it("garde les messages boutique déjà clairs", () => {
    expect(shopPublicError(new Error("Votre panier est vide."))).toBe("Votre panier est vide.");
  });

  it("traduit les erreurs techniques", () => {
    expect(shopPublicError(new Error("Panier vide"))).toMatch(/panier est vide/i);
    expect(shopPublicError(new Error("AUTH_SECRET manquant"))).toMatch(/676 93 51 95/);
    expect(shopPublicError(new Error("Failed to fetch"))).toMatch(/676 93 51 95/);
    expect(shopPublicError(new Error("DATABASE_URL manquant"))).not.toMatch(/DATABASE_URL/);
    expect(shopPublicError(new Error("Timed out fetching a new connection from the connection pool"))).toMatch(
      /676 93 51 95/,
    );
    expect(
      shopPublicError(new Error("FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15")),
    ).toMatch(/676 93 51 95/);
  });

  it("n’expose pas les variables d’environnement sur les pages boutique", () => {
    const files = [
      "src/app/error.tsx",
      "src/app/global-error.tsx",
      "src/app/(shop)/page.tsx",
      "src/components/shop/chrome.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/DATABASE_URL|AUTH_SECRET|DIRECT_URL/);
    }
  });
});
