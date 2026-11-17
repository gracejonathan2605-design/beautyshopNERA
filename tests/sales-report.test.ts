import { describe, expect, it } from "vitest";
import { salesReportRange, summarizeSalesReport } from "../src/lib/sales-report";
import { parseReportQuery } from "../src/lib/report-query";

describe("périodes des ventes", () => {
  it("utilise les jours camerounais, lundi pour la semaine et le premier pour le mois", () => {
    const now = new Date("2026-11-01T23:30:00Z");
    expect(salesReportRange("today", undefined, undefined, now)?.from.toISOString()).toBe("2026-11-01T23:00:00.000Z");
    expect(salesReportRange("today", undefined, undefined, now)?.to.toISOString()).toBe("2026-11-02T22:59:59.999Z");
    expect(salesReportRange("week", undefined, undefined, now)?.from.toISOString()).toBe("2026-11-01T23:00:00.000Z");
    expect(salesReportRange("month", undefined, undefined, now)?.from.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(salesReportRange("7d", undefined, undefined, now)?.from.toISOString()).toBe("2026-10-26T23:00:00.000Z");
  });

  it("rejette les dates invalides et ne laisse pas les anciennes dates modifier un autre preset", () => {
    expect(parseReportQuery({ preset: "custom", from: "2026-02-30", to: "2026-03-01" }).error).toBeTruthy();
    expect(parseReportQuery({ preset: "custom", from: "2026-03-02", to: "2026-03-01" }).error).toBeTruthy();
    const now = new Date("2026-11-02T12:00:00Z");
    expect(salesReportRange("today", "2020-01-01", "2020-01-02", now)?.from.toISOString()).toBe("2026-11-01T23:00:00.000Z");
  });
});

describe("bénéfices par jour", () => {
  it("utilise le coût enregistré, groupe en heure locale et évite les doubles déductions", () => {
    const result = summarizeSalesReport([
      { createdAt: new Date("2026-11-01T23:15:00Z"), total: 12000, items: [
        { quantity: 2, unitCost: 3000, variant: { costPrice: 5000, product: { stockOwner: "NERA" } } },
      ] },
      { createdAt: new Date("2026-11-02T23:15:00Z"), total: 1000, items: [
        { quantity: 1, unitCost: null, variant: { costPrice: 4000, product: { stockOwner: "PARTNER" } } },
      ] },
    ], [
      { date: new Date("2026-11-02T12:00:00Z"), amount: 1000, category: { slug: "transport" }, description: null, cashSessionId: null },
      { date: new Date("2026-11-02T12:00:00Z"), amount: 9000, category: { slug: "achat-marchandises" }, description: null, cashSessionId: null },
      { date: new Date("2026-11-02T12:00:00Z"), amount: 3000, category: { slug: "autre" }, description: "Remboursement POS-1", cashSessionId: "caisse" },
    ], new Set(["POS-1"]));
    expect(result.daily).toEqual([
      { day: "2026-11-03", revenue: 1000, cost: 4000, expenses: 0, profit: -3000 },
      { day: "2026-11-02", revenue: 12000, cost: 6000, expenses: 1000, profit: 5000 },
    ]);
    expect(result.totals).toEqual({ revenue: 13000, cost: 10000, expenses: 1000, profit: 2000 });
    expect(result.historicalLines).toBe(1);
    expect(result.partnerLines).toBe(1);
  });

  it("signale un coût nul et conserve les dépenses qui ne correspondent pas à une vente annulée", () => {
    const result = summarizeSalesReport([
      { createdAt: new Date("2026-11-02T12:00:00Z"), total: 1000, items: [
        { quantity: 1, unitCost: 0, variant: { costPrice: 2000, product: { stockOwner: "NERA" } } },
      ] },
    ], [
      { date: new Date("2026-11-02T12:00:00Z"), amount: 1500, category: { slug: "autre" }, description: "Remboursement POS-2", cashSessionId: "caisse" },
    ], new Set());
    expect(result.missingCostLines).toBe(1);
    expect(result.totals.profit).toBe(-500);
  });
});
