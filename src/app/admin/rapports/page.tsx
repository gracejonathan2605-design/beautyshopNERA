import { requireStaff } from "@/lib/guard";
import { getDashboardMetrics, getSalesProfitReport, salesByPaymentMethod, salesByUser } from "@/services/reports.service";
import { formatCfa } from "@/lib/money";
import { parseReportQuery, REPORT_PRESETS } from "@/lib/report-query";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireStaff("reports.view");
  const raw = await searchParams;
  const { preset, from, to, range, error } = parseReportQuery(raw);
  if (error) {
    return <div><h1 className="font-serif text-4xl">Rapports</h1><p role="alert" className="mt-4 text-red-700">{error}</p><a className="mt-4 inline-block underline" href="/admin/rapports">Retour aux rapports</a></div>;
  }
  const [report, metrics, byPay, byUser] = await Promise.all([
    getSalesProfitReport(range),
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
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/admin/rapports?preset=today" className="rounded-full border px-4 py-2 text-sm">Aujourd’hui</a>
        <a href="/admin/rapports?preset=week" className="rounded-full border px-4 py-2 text-sm">Cette semaine</a>
        <a href="/admin/rapports?preset=month" className="rounded-full border px-4 py-2 text-sm">Ce mois</a>
      </div>
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
        Du {range.from.toLocaleString("fr-FR", { timeZone: "Africa/Douala" })} au {range.to.toLocaleString("fr-FR", { timeZone: "Africa/Douala" })} (heure du Cameroun)
      </p>
      <p className="mt-1 text-xs text-black/45">Pour choisir des dates, sélectionnez « Période ».</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-cream p-5">Ventes {formatCfa(report.totals.revenue)}</div>
        <div className="rounded-2xl bg-cream p-5">Caisse {formatCfa(metrics.posRevenue)}</div>
        <div className="rounded-2xl bg-cream p-5">En ligne {formatCfa(metrics.onlineRevenue)}</div>
        <div className="rounded-2xl bg-cream p-5">Coût des produits vendus {formatCfa(report.totals.cost)}</div>
        <div className="rounded-2xl bg-cream p-5">Autres dépenses {formatCfa(report.totals.expenses)}</div>
        <div className="rounded-2xl bg-cream p-5">{report.totals.profit < 0 ? "Perte" : "Bénéfice"} estimé : {formatCfa(Math.abs(report.totals.profit))}</div>
      </div>
      <p className="mt-4 text-sm text-black/70">
        Résultat = ventes − coût des produits vendus − autres dépenses enregistrées. Les achats de marchandises ne sont pas déduits une deuxième fois.
        Les ventes annulées ou remboursées sont exclues rétroactivement ; les commandes en ligne sont comptées à leur date de création lorsqu’elles sont expédiées ou livrées.
        Les frais et pertes non enregistrés, notamment les retours sans remise en stock, ne sont pas inclus.
      </p>
      {report.historicalLines > 0 && <p className="mt-2 text-sm text-red-700">Pour {report.historicalLines} ligne(s) ancienne(s), le prix d’achat historique est inconnu : le prix actuel est utilisé.</p>}
      {report.missingCostLines > 0 && <p className="mt-2 text-sm text-red-700">{report.missingCostLines} ligne(s) ont un prix d’achat nul : vérifiez les prix renseignés.</p>}
      {report.partnerLines > 0 && <p className="mt-2 text-sm text-red-700">Les ventes partenaires utilisent le prix d’achat indiqué ; les commissions ou reversements partenaires ne sont pas calculés ici.</p>}
      <h2 className="mt-8 font-serif text-2xl">Résultat par jour</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th className="p-3">Date</th><th className="p-3">Ventes</th><th className="p-3">Coût produits</th><th className="p-3">Dépenses</th><th className="p-3">Bénéfice / perte</th></tr></thead>
          <tbody>
            {report.daily.map((day) => <tr key={day.day} className="border-t"><td className="p-3">{day.day.split("-").reverse().join("/")}</td><td className="p-3">{formatCfa(day.revenue)}</td><td className="p-3">{formatCfa(day.cost)}</td><td className="p-3">{formatCfa(day.expenses)}</td><td className="p-3">{formatCfa(day.profit)}</td></tr>)}
          </tbody>
        </table>
        {!report.daily.length && <p className="p-3 text-sm text-black/60">Aucune vente ou dépense pour cette période.</p>}
      </div>
      <h2 className="mt-8 font-serif text-2xl">Par paiement</h2>
      <ul className="mt-3 space-y-2">
        {byPay.map((p) => (
          <li key={`${p.channel}-${p.method}`} className="rounded-xl bg-cream p-3">
            {p.channel} · {p.method} · {formatCfa(p._sum.amount ?? 0)} · {p._count} paiement{p._count > 1 ? "s" : ""}
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
