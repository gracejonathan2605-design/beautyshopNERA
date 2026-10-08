import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NJANGI_BANNER_COPIES,
  NJANGI_WHATSAPP_TEXT,
  njangiWhatsAppUrl,
} from "../src/lib/njangi-skincare";

function src(path: string) {
  return readFileSync(path, "utf8");
}

describe("bannière Njangi Skincare", () => {
  it("ouvre WhatsApp boutique avec les deux cotisations", () => {
    const url = njangiWhatsAppUrl();
    expect(url.startsWith("https://wa.me/237676935195?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toBe(NJANGI_WHATSAPP_TEXT);
    expect(text).toContain("5 000 FCFA");
    expect(text).toContain("30 000 FCFA");
    expect(text).toContain("10 000 FCFA");
    expect(text).toContain("60 000 FCFA");
    expect(text).toContain("Njangi Skincare");
    expect(text).toContain("Gamme personnalisée");
    expect(text).toContain("Coffret VIP");
  });

  it("défile en tête des pages boutique, pas dans l’admin ni la caisse", () => {
    const layout = src("src/app/(shop)/layout.tsx");
    expect(layout).toContain("<NjangiSkincareBanner />");
    expect(layout.indexOf("<NjangiSkincareBanner />")).toBeLessThan(layout.indexOf("<ShopHeader />"));
    expect(layout).toContain("revalidate = 60");
    expect(layout).not.toMatch(/force-dynamic/);
    expect(src("src/app/admin/layout.tsx")).not.toContain("NjangiSkincareBanner");
    expect(src("src/app/pos/layout.tsx")).not.toContain("NjangiSkincareBanner");
  });

  it("reste une boucle CSS, cliquable, et s’arrête si le mouvement est réduit", () => {
    const banner = src("src/components/shop/njangi-banner.tsx");
    const css = src("src/app/globals.css");
    expect(NJANGI_BANNER_COPIES % 2).toBe(0);
    expect(banner).toContain("target=\"_blank\"");
    expect(banner).toContain("rel=\"noopener noreferrer\"");
    expect(banner).toContain("no-print");
    expect(banner).toContain("NJANGI_BANNER_COPIES");
    expect(css).toContain("@keyframes njangi-marquee");
    expect(css).toContain("translate3d(-50%, 0, 0)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation-play-state: paused");
    expect(statSync("public/brand/njangi-skincare.webp").size).toBeLessThan(220 * 1024);
  });
});