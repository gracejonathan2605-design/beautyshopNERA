import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/guard";
import { parseReportQuery } from "@/lib/report-query";
import { getDashboardMetrics, getSalesProfitReport, salesByPaymentMethod, salesByUser } from "@/services/reports.service";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  await requireStaff("reports.view");
  const url = new URL(request.url);
  const { preset, range, error } = parseReportQuery({
    preset: url.searchParams.get("preset") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (error) return new NextResponse(error, { status: 400 });
  const [report, metrics, byPay, byUser] = await Promise.all([
    getSalesProfitReport(range),
    getDashboardMetrics(range),
    salesByPaymentMethod(range),
    salesByUser(range),
  ]);
  const rows: Array<Array<string | number>> = [
    ["Rapport NERA", preset, range.from.toISOString(), range.to.toISOString()],
    [],
    ["Indicateur", "Montant"],
    ["Ventes", report.totals.revenue],
    ["POS", metrics.posRevenue],
    ["En ligne", metrics.onlineRevenue],
    ["Coût des produits vendus", report.totals.cost],
    ["Autres dépenses", report.totals.expenses],
    ["Bénéfice ou perte estimé", report.totals.profit],
    ["Panier moyen", metrics.averageBasket],
    ["Alertes stock", metrics.lowStockCount],
    ["Lignes avec prix historique inconnu", report.historicalLines],
    ["Lignes avec prix d'achat nul", report.missingCostLines],
    ["Lignes partenaires (reversements non calculés)", report.partnerLines],
    ["Note", "Ventes annulées et remboursées exclues rétroactivement ; commandes expédiées ou livrées comptées à leur création ; achats de marchandises exclus des dépenses."],
    ["Note", "Prix historique inconnu : prix actuel utilisé. Frais non enregistrés et pertes sur retours sans remise en stock non inclus."],
    [],
    ["Date", "Ventes", "Coût produits", "Dépenses", "Bénéfice ou perte estimé"],
    ...report.daily.map((day) => [day.day, day.revenue, day.cost, day.expenses, day.profit]),
    [],
    ["Paiement", "Canal", "Montant", "Nombre"],
    ...byPay.map((p) => [p.method, p.channel, p._sum.amount ?? 0, p._count]),
    [],
    ["Caisse", "CA", "Ventes"],
    ...byUser.map((u) => [u.name, u.total, u.count]),
    [],
    ["Top produit", "SKU", "Qté", "Montant"],
    ...metrics.topProducts.map((p) => [p.name, p.sku, p.qty, p.amount]),
  ];
  const csv = `\uFEFF${toCsv(rows)}`;
  const stamp = range.from.toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nera-rapport-${stamp}.csv"`,
    },
  });
}
