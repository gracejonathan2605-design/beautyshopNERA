import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/ops";
import Link from "next/link";
import { alertFallbackHref, orderNumberFromAlert } from "@/lib/alert-href";

const TYPE_LABEL: Record<string, string> = {
  NEW_ORDER: "Nouvelle commande",
  STOCK_LOW: "Stock bas",
  STOCK_OUT: "Rupture",
};

function formatWhen(date: Date) {
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function AlertsPage() {
  const session = await requireStaff();
  const alerts = await prisma.notification.findMany({
    where: { OR: [{ userId: null }, { userId: session.userId }] },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const unread = alerts.filter((a) => !a.isRead).length;
  const orderNumbers = alerts
    .map((a) => (a.type === "NEW_ORDER" ? orderNumberFromAlert(a.message) : null))
    .filter((n): n is string => Boolean(n));
  const orders = orderNumbers.length
    ? await prisma.order.findMany({
        where: { number: { in: orderNumbers } },
        select: { id: true, number: true },
      })
    : [];
  const orderIds = new Map(orders.map((o) => [o.number, o.id]));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Alertes</h1>
          <p className="mt-2 text-sm text-black/55">
            {unread} non lue{unread > 1 ? "s" : ""} · nouvelles commandes et stock.
          </p>
        </div>
        {unread ? (
          <form action={markAllNotificationsRead}>
            <button className="rounded-full border px-4 py-2 text-sm">Tout marquer lu</button>
          </form>
        ) : null}
      </div>
      {alerts.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-cream p-8 text-black/55">Aucune alerte pour le moment.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {alerts.map((alert) => {
            const number = alert.type === "NEW_ORDER" ? orderNumberFromAlert(alert.message) : null;
            const href =
              number && orderIds.get(number)
                ? `/admin/commandes/${orderIds.get(number)}`
                : alertFallbackHref(alert.type);
            return (
              <li
                key={alert.id}
                className={`rounded-2xl p-4 ${alert.isRead ? "bg-cream/70" : "border border-gold/40 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-gold">
                      {TYPE_LABEL[alert.type] ?? alert.type}
                    </p>
                    <p className="mt-1 font-medium text-wine">{alert.title}</p>
                    <p className="mt-1 text-sm text-black/60">{alert.message}</p>
                    <p className="mt-2 text-xs text-black/40">{formatWhen(alert.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={href} className="rounded-full border px-3 py-1 text-xs">
                      {alert.type === "NEW_ORDER" ? "Voir" : "Stocks"}
                    </Link>
                    {!alert.isRead ? (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={alert.id} />
                        <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">Lu</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
