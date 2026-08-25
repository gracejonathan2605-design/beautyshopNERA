import { requireStaff } from "@/lib/guard";
import { getDashboardMetrics, salesByPaymentMethod, salesByUser } from "@/services/reports.service";
import { formatCfa } from "@/lib/money";
import { parseReportQuery, REPORT_PRESETS } from "@/lib/report-query";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireStaff("reports.view");
  const raw = await searchParams;
  const { preset, from, to, range } = parseReportQuery(raw);
  const [metrics, byPay, byUser] = await Promise.all([
    getDashboardMetrics(range),
    salesByPaymentMethod(range),
    salesByUser(range),
  ]);
  const exportHref = `/admin/rapports/export?${new URLSearchParams({
    preset,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString()}`;
  return (
    <div>
      <h1 className="font-serif text-4xl">Rapports</h1>
      <form className="mt-6 flex flex-wrap items-end gap-2 rounded-2xl bg-cream p-4">
        <label className="text-sm">
          Période
          <select name="preset" defaultValue={preset} className="mt-1 block rounded-xl border px-3 py-2">
            {REPORT_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Du
          <input type="date" name="from" defaultValue={from} className="mt-1 block rounded-xl border px-3 py-2" />
        </label>
        <label className="text-sm">
          Au
          <input type="date" name="to" defaultValue={to} className="mt-1 block rounded-xl border px-3 py-2" />
        </label>
        <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Afficher</button>
        <a href={exportHref} className="rounded-full border px-4 py-2 text-sm">
          Export CSV
        </a>
      </form>
      <p className="mt-3 text-xs text-black/45">
        Du {range.from.toLocaleString("fr-FR")} au {range.to.toLocaleString("fr-FR")}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-cream p-5">CA {formatCfa(metrics.revenue)}</div>
        <div className="rounded-2xl bg-cream p-5">POS {formatCfa(metrics.posRevenue)}</div>
        <div className="rounded-2xl bg-cream p-5">En ligne {formatCfa(metrics.onlineRevenue)}</div>
        <div className="rounded-2xl bg-cream p-5">COGS {formatCfa(metrics.cogs)}</div>
        <div className="rounded-2xl bg-cream p-5">Dépenses {formatCfa(metrics.expenseTotal)}</div>
        <div className="rounded-2xl bg-cream p-5">Bénéfice {formatCfa(metrics.profit)}</div>
      </div>
      <h2 className="mt-8 font-serif text-2xl">Par paiement</h2>
      <ul className="mt-3 space-y-2">
        {byPay.map((p) => (
          <li key={p.method} className="rounded-xl bg-cream p-3">
            {p.method} · {formatCfa(p._sum.amount ?? 0)} · {p._count} paiement{p._count > 1 ? "s" : ""}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-serif text-2xl">Par utilisateur</h2>
      <ul className="mt-3 space-y-2">
        {byUser.map((u) => (
          <li key={u.userId} className="rounded-xl bg-cream p-3">
            {u.name} · {formatCfa(u.total)} · {u.count} ventes
          </li>
        ))}
      </ul>
    </div>
  );
}
