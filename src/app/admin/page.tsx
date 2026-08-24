import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/guard";
import { defaultStaffPath, hasPermission } from "@/lib/permissions";
import { getDashboardMetrics, rangeFromPreset } from "@/services/reports.service";
import { formatCfa } from "@/lib/money";

export default async function AdminHomePage() {
  const session = await requireStaff();
  if (!hasPermission(session, "dashboard.view")) {
    redirect(defaultStaffPath(session));
  }
  const m = await getDashboardMetrics(rangeFromPreset("today"));
  const cards = [
    ["CA du jour", formatCfa(m.revenue)],
    ["POS", formatCfa(m.posRevenue)],
    ["En ligne", formatCfa(m.onlineRevenue)],
    ["Panier moyen", formatCfa(m.averageBasket)],
    ["Bénéfice estimé", formatCfa(m.profit)],
    ["Alertes stock", String(m.lowStockCount)],
  ];
  return (
    <div>
      <h1 className="font-serif text-4xl">Tableau de bord</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#eee0e6] bg-white p-5 shadow-sm">
            <p className="text-sm text-black/50">{label}</p>
            <p className="mt-2 font-serif text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 font-serif text-2xl">Meilleures ventes</h2>
      <ul className="mt-4 space-y-2">
        {m.topProducts.map((p) => (
          <li key={p.sku} className="flex justify-between rounded-xl border border-[#eee0e6] bg-white px-4 py-3">
            <span>{p.name}</span>
            <span>{p.qty} · {formatCfa(p.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
