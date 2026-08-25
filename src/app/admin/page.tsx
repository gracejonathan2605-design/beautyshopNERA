import { redirect } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { defaultStaffPath, hasPermission } from "@/lib/permissions";
import { getDashboardMetrics, rangeFromPreset } from "@/services/reports.service";
import { formatCfa } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { availableQty } from "@/services/inventory.service";
import { alertFallbackHref, orderNumberFromAlert } from "@/lib/alert-href";

export default async function AdminHomePage() {
  const session = await requireStaff();
  if (!hasPermission(session, "dashboard.view")) {
    redirect(defaultStaffPath(session));
  }
  const m = await getDashboardMetrics(rangeFromPreset("today"));
  const [alerts, lowStock] = await Promise.all([
    prisma.notification.findMany({
      where: { isRead: false, OR: [{ userId: null }, { userId: session.userId }] },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.inventory.findMany({
      where: {},
      include: { variant: { select: { name: true, product: { select: { name: true } } } } },
      take: 40,
    }),
  ]);
  const orderNumbers = alerts
    .map((a) => (a.type === "NEW_ORDER" ? orderNumberFromAlert(a.message) : null))
    .filter((n): n is string => Boolean(n));
  const relatedOrders = orderNumbers.length
    ? await prisma.order.findMany({
        where: { number: { in: orderNumbers } },
        select: { id: true, number: true },
      })
    : [];
  const orderIds = new Map(relatedOrders.map((o) => [o.number, o.id]));
  const low = lowStock.filter((row) => availableQty(row.onHand, row.reserved) <= row.minQuantity).slice(0, 6);
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
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Alertes</h2>
            <Link href="/admin/alertes" className="text-sm underline">
              Tout voir
            </Link>
          </div>
          {alerts.length ? (
            <ul className="mt-4 space-y-2">
              {alerts.map((a) => {
                const number = a.type === "NEW_ORDER" ? orderNumberFromAlert(a.message) : null;
                const href = number && orderIds.get(number)
                  ? `/admin/commandes/${orderIds.get(number)}`
                  : alertFallbackHref(a.type);
                return (
                <li key={a.id}>
                  <Link href={href} className="block rounded-xl border border-[#eee0e6] bg-white px-4 py-3">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-black/55">{a.message}</p>
                  </Link>
                </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-black/50">Rien de nouveau.</p>
          )}
        </section>
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Stock bas</h2>
            <Link href="/admin/stocks" className="text-sm underline">
              Stocks
            </Link>
          </div>
          {low.length ? (
            <ul className="mt-4 space-y-2">
              {low.map((row) => (
                <li key={row.id} className="flex justify-between rounded-xl border border-[#eee0e6] bg-white px-4 py-3">
                  <span>
                    {row.variant.product.name} — {row.variant.name}
                  </span>
                  <span>{availableQty(row.onHand, row.reserved)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-black/50">Aucun stock bas.</p>
          )}
        </section>
      </div>
      <h2 className="mt-10 font-serif text-2xl">Meilleures ventes</h2>
      <ul className="mt-4 space-y-2">
        {m.topProducts.map((p) => (
          <li key={p.sku} className="flex justify-between rounded-xl border border-[#eee0e6] bg-white px-4 py-3">
            <span>{p.name}</span>
            <span>
              {p.qty} · {formatCfa(p.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
