import { rangeFromPreset, type ReportRange } from "@/services/reports.service";

export const REPORT_PRESETS = [
  { id: "today", label: "Aujourd’hui" },
  { id: "week", label: "Cette semaine" },
  { id: "7d", label: "7 derniers jours" },
  { id: "30d", label: "30 derniers jours" },
  { id: "month", label: "Ce mois" },
  { id: "custom", label: "Période" },
] as const;

export type ReportPresetId = (typeof REPORT_PRESETS)[number]["id"];

export function parseReportQuery(sp: { preset?: string; from?: string; to?: string }): {
  preset: ReportPresetId;
  from?: string;
  to?: string;
  range: ReportRange;
} {
  const allowed = new Set(REPORT_PRESETS.map((p) => p.id));
  const preset = (allowed.has(sp.preset as ReportPresetId) ? sp.preset : "month") as ReportPresetId;
  const from = sp.from?.trim() || undefined;
  const to = sp.to?.trim() || undefined;
  return { preset, from, to, range: rangeFromPreset(preset, from, to) };
}
