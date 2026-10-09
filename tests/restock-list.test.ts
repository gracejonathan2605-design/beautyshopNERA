import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { stockAlertKind } from "../src/lib/stock-alert";
import {
  chunkRestockWhatsApp,
  formatRestockWhatsApp,
  restockCsv,
  restockLevel,
  restockPrintHtml,
  restockWeekStart,
  restockWhatsAppUrls,
  sortRestockLines,
  suggestedBuyQty,
  toRestockLine,
  type RestockSource,
} from "../src/lib/restock-list";

function source(patch: Partial<RestockSource> = {}): RestockSource {
  return {
    inventoryId: "inv-1",
    variantId: "var-1",
    productName: "Crème visage nuit",
    variantName: "50 ml",
    sku: "NERA-NUIT",
    barcode: "123456",
    category: "Soins",
    location: "Boutique",
    onHand: 0,
    reserved: 0,
    minQuantity: 3,
    costPrice: 4500,
    salePrice: 8000,
    supplierName: "Maison Glow",
    supplierPhone: "690000000",
    soldThisWeek: 2,
    lastMovementAt: new Date("2026-10-09T12:00:00.000Z"),
    lastMovementType: "SALE_POS",
    ...patch,
  };
}

describe("alertes à la facture", () => {
  it("signale une rupture quand deux produits facturés tombent à zéro", () => {
    expect(stockAlertKind(2, 0, 3)).toBe("STOCK_OUT");
    expect(stockAlertKind(1, 0, 3)).toBe("STOCK_OUT");
    expect(stockAlertKind(5, 0, 3)).toBe("STOCK_OUT");
  });

  it("signale un stock faible avant la rupture, sans doubler l’alerte", () => {
    expect(stockAlertKind(5, 2, 3)).toBe("STOCK_LOW");
    expect(stockAlertKind(4, 3, 3)).toBe("STOCK_LOW");
    expect(stockAlertKind(2, 1, 3)).toBeNull();
    expect(stockAlertKind(0, 0, 3)).toBeNull();
  });
});

describe("liste d’achats", () => {
  it("met les deux produits finis dans le tableau, et laisse celui encore en stock", () => {
    const fini = toRestockLine(source());
    const autre = toRestockLine(
      source({
        inventoryId: "inv-2",
        variantId: "var-2",
        productName: "Lait corporel",
        sku: "NERA-LAIT",
        onHand: 0,
        soldThisWeek: 5,
        minQuantity: 3,
      }),
    );
    const reste = toRestockLine(source({ inventoryId: "inv-3", productName: "Parfum", onHand: 8, reserved: 0, minQuantity: 3 }));
    expect(reste).toBeNull();
    const lines = sortRestockLines([fini, autre].filter((line) => line !== null));
    expect(lines.map((line) => line.productName)).toEqual(["Lait corporel", "Crème visage nuit"]);
    expect(lines.every((line) => line.level === "vide")).toBe(true);
    expect(lines[0]?.buyQty).toBe(5);
    expect(lines[1]?.buyQty).toBe(3);
  });

  it("distingue un rayon vide, un stock promis et un stock bientôt fini", () => {
    expect(restockLevel(0, 0, 3)).toBe("vide");
    expect(restockLevel(2, 2, 3)).toBe("promis");
    expect(restockLevel(2, 0, 3)).toBe("bas");
    expect(restockLevel(4, 0, 3)).toBeNull();
    expect(suggestedBuyQty("bas", 2, 3, 0)).toBe(1);
    expect(suggestedBuyQty("promis", 0, 3, 1)).toBe(3);
  });

  it("compte la semaine à partir du lundi", () => {
    const start = restockWeekStart(new Date("2026-10-09T18:00:00.000Z"));
    expect(start.getDay()).toBe(1);
  });

  it("prépare un tableau imprimable, un CSV et un WhatsApp détaillé", () => {
    const line = toRestockLine(source({ productName: "Crème <nuit>" }));
    expect(line).not.toBeNull();
    const lines = [line!];
    const html = restockPrintHtml(lines, new Date("2026-10-09T12:00:00.000Z"));
    expect(html).toContain("<table>");
    expect(html).toContain("Crème &lt;nuit&gt;");
    expect(html).toContain("NERA-NUIT");
    expect(html).toContain("Maison Glow");
    expect(html).toContain("À acheter");
    expect(html).not.toContain("<nuit>");

    const csv = restockCsv(lines);
    expect(csv.startsWith("\uFEFFÉtat,Produit")).toBe(true);
    expect(csv).toContain("NERA-NUIT");
    expect(csv).toContain("4500");

    const text = formatRestockWhatsApp(lines, new Date("2026-10-09T12:00:00.000Z"));
    expect(text).toContain("FINIS — à racheter");
    expect(text).toContain("À acheter : 3");
    expect(text).toContain("Vendus cette semaine : 2");
    expect(text).toContain("Vente caisse");
    expect(text).toContain("budget estimé");

    const urls = restockWhatsAppUrls("+237676935195", lines, new Date("2026-10-09T12:00:00.000Z"));
    expect(urls[0]).toMatch(/^https:\/\/wa\.me\/237676935195\?text=/);
    expect(decodeURIComponent(urls[0]!.split("text=")[1]!)).toContain("Crème <nuit>");
  });

  it("découpe une longue liste pour que WhatsApp puisse l’ouvrir", () => {
    const lines = Array.from({ length: 40 }, (_, index) => {
      const line = toRestockLine(
        source({
          inventoryId: `inv-${index}`,
          productName: `Produit ${index} `.repeat(8).trim(),
          sku: `SKU-${index}`,
        }),
      );
      if (!line) throw new Error("ligne");
      return line;
    });
    const chunks = chunkRestockWhatsApp(formatRestockWhatsApp(lines, new Date("2026-10-09T12:00:00.000Z")), 900);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("1/");
    for (const chunk of chunks) {
      expect(encodeURIComponent(chunk).length).toBeLessThan(1200);
    }
  });

  it("relie la liste au menu, aux alertes et au stock", () => {
    expect(readFileSync("src/components/admin/shell.tsx", "utf8")).toContain("/admin/stocks/renouveler");
    expect(readFileSync("src/app/admin/stocks/page.tsx", "utf8")).toContain("/admin/stocks/renouveler");
    expect(readFileSync("src/app/admin/stocks/renouveler/page.tsx", "utf8")).toContain("loadRestockList");
    expect(readFileSync("src/components/admin/restock-list-panel.tsx", "utf8")).toContain("Imprimer");
    expect(readFileSync("src/components/admin/restock-list-panel.tsx", "utf8")).toContain("Envoyer sur WhatsApp");
    expect(readFileSync("src/services/inventory.service.ts", "utf8")).toContain("stockAlertKind");
  });
});
