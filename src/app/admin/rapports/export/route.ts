import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/guard";
import { parseReportQuery } from "@/lib/report-query";
import { getDashboardMetrics, salesByPaymentMethod, salesByUser } from "@/services/reports.service";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  await requireStaff("reports.view");
  const url = new URL(request.url);
  const { preset, from, to, range } = parseReportQuery({
    preset: url.searchParams.get("preset") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  const [metrics, byPay, byUser] = await Promise.all([
    getDashboardMetrics(range),
    salesByPaymentMethod(range),
    salesByUser(range),
  ]);
  const rows: Array<Array<string | number>> = [
    ["Rapport NERA", preset, range.from.toISOString(), range.to.toISOString()],
    [],
    ["Indicateur", "Montant"],
    ["CA", metrics.revenue],
    ["POS", metrics.posRevenue],
    ["En ligne", metrics.onlineRevenue],
    ["COGS", metrics.cogs],
    ["Dépenses", metrics.expenseTotal],
    ["Bénéfice", metrics.profit],
    ["Panier moyen", metrics.averageBasket],
    ["Alertes stock", metrics.lowStockCount],
    [],
    ["Paiement", "Montant", "Nombre"],
    ...byPay.map((p) => [p.method, p._sum.amount ?? 0, p._count]),
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
