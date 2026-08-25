import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { changeOrderStatus, collectOrderPayment } from "@/app/actions/admin";
import { formatCfa } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/status-labels";
import { PAYMENT_LABELS } from "@/lib/receipt";
import { hasPermission } from "@/lib/permissions";
import { ORDER_TRANSITIONS } from "@/lib/order-flow";

function formatWhen(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrdersAdminPage() {
  const session = await requireStaff("orders.view");
  const canUpdate = hasPermission(session, "orders.update");
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      createdAt: true,
      shippingName: true,
      shippingPhone: true,
      customer: { select: { firstName: true, lastName: true, phone: true } },
      payments: { select: { status: true, method: true, amount: true, reference: true } },
      items: { select: { id: true, quantity: true, productName: true }, take: 5 },
    },
    take: 100,
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Commandes</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Commandes de la boutique en ligne. Si le paiement mobile est encore en attente, cliquez sur{" "}
        <strong>Encaisser</strong> après vérification.
      </p>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#eee0e6] bg-white p-8">
          <p className="font-medium text-wine">Aucune commande pour le moment</p>
          <p className="mt-2 text-sm text-black/55">
            Les commandes passées sur le site s’affichent ici, avec le paiement et le statut.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => {
            const pendingPay = o.payments.find((p) => p.status === "PENDING");
            const paid = o.payments.some((p) => p.status === "COMPLETED");
            const customer = o.customer
              ? `${o.customer.firstName} ${o.customer.lastName}`.trim()
              : o.shippingName || "Invité";
            const phone = o.shippingPhone || o.customer?.phone;
            return (
              <article key={o.id} className="rounded-2xl bg-cream p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{o.number}</p>
                    <p className="text-sm text-black/50">
                      {formatWhen(o.createdAt)} · {customer}
                      {phone ? ` · ${phone}` : ""} · {formatCfa(o.total)}
                    </p>
                    <p className="mt-1 text-sm text-black/55">
                      {paid ? "Payée" : pendingPay ? "Paiement en attente" : "Sans paiement"}
                      {o.payments[0]
                        ? ` · ${PAYMENT_LABELS[o.payments[0].method] ?? o.payments[0].method}`
                        : ""}
                      {o.payments[0]?.reference ? ` · ${o.payments[0].reference}` : ""}
                    </p>
                    {o.items.length ? (
                      <ul className="mt-2 text-sm text-black/60">
                        {o.items.slice(0, 4).map((item) => (
                          <li key={item.id}>
                            {item.quantity} × {item.productName}
                          </li>
                        ))}
                        {o.items.length > 4 ? <li>… {o.items.length - 4} autre(s)</li> : null}
                      </ul>
                    ) : null}
                  </div>
                  {canUpdate ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {pendingPay ? (
                        <form action={collectOrderPayment}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">
                            Encaisser {formatCfa(pendingPay.amount)}
                          </button>
                        </form>
                      ) : null}
                      <form action={changeOrderStatus} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <select name="status" defaultValue={o.status} className="rounded-xl border px-3 py-2 text-sm">
                          {[o.status, ...ORDER_TRANSITIONS[o.status]].filter((s, i, a) => a.indexOf(s) === i).map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Mettre à jour</button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-sm text-black/50">{ORDER_STATUS_LABELS[o.status] ?? o.status}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
