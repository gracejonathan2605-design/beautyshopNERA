import { describe, expect, it } from "vitest";
import { csvEscape, csvRow, toCsv } from "../src/lib/csv";
import { parseReportQuery } from "../src/lib/report-query";
import { rangeFromPreset } from "../src/services/reports.service";
import { orderNumberFromAlert } from "../src/lib/alert-href";

describe("CSV", () => {
  it("échappe les virgules et guillemets", () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('dit "ok"')).toBe('"dit ""ok"""');
    expect(csvRow(["CA", 12000, null])).toBe("CA,12000,");
    expect(toCsv([["A", "B"], ["1", "2"]])).toContain("A,B");
  });
});

describe("période rapports", () => {
  it("lit le preset et une période personnalisée", () => {
    expect(parseReportQuery({}).preset).toBe("month");
    expect(parseReportQuery({ preset: "today" }).preset).toBe("today");
    const custom = parseReportQuery({ preset: "custom", from: "2026-08-01", to: "2026-08-10" });
    expect(custom.range.from.getTime()).toBeLessThan(custom.range.to.getTime());
    expect(custom.range.to.getHours()).toBe(23);
    expect(orderNumberFromAlert("Commande NERA-2026-000012 — 15000 FCFA")).toBe("NERA-2026-000012");
  });

  it("fournit jour, semaine et 30 jours", () => {
    const today = rangeFromPreset("today");
    const week = rangeFromPreset("week");
    const month = rangeFromPreset("month");
    expect(today.from.getTime()).toBeLessThanOrEqual(today.to.getTime());
    expect(week.from.getTime()).toBeLessThan(month.to.getTime());
  });
});
