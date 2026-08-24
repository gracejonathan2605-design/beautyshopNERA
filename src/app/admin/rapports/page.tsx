import { requireStaff } from "@/lib/guard";
import { getDashboardMetrics, rangeFromPreset, salesByPaymentMethod, salesByUser } from "@/services/reports.service";
import { formatCfa } from "@/lib/money";

export default async function ReportsPage() {
  await requireStaff("reports.view");
  const range = rangeFromPreset("month");
  const [metrics, byPay, byUser] = await Promise.all([
    getDashboardMetrics(range),
    salesByPaymentMethod(range),
    salesByUser(range),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">Rapports</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-cream p-5">CA {formatCfa(metrics.revenue)}</div>
        <div className="rounded-2xl bg-cream p-5">COGS {formatCfa(metrics.cogs)}</div>
        <div className="rounded-2xl bg-cream p-5">Bénéfice {formatCfa(metrics.profit)}</div>
      </div>
      <h2 className="mt-8 font-serif text-2xl">Par paiement</h2>
      <ul className="mt-3 space-y-2">
        {byPay.map((p) => (
          <li key={p.method} className="rounded-xl bg-cream p-3">{p.method} · {formatCfa(p._sum.amount ?? 0)}</li>
        ))}
      </ul>
      <h2 className="mt-8 font-serif text-2xl">Par utilisateur</h2>
      <ul className="mt-3 space-y-2">
        {byUser.map((u) => (
          <li key={u.userId} className="rounded-xl bg-cream p-3">{u.name} · {formatCfa(u.total)} · {u.count} ventes</li>
        ))}
      </ul>
    </div>
  );
}
