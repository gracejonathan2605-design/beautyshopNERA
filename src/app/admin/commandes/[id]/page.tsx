import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { changeOrderStatus, collectOrderPayment } from "@/app/actions/admin";
import { updateOrderNotes } from "@/app/actions/ops";
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

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff("orders.view");
  const { id } = await params;
  const canUpdate = hasPermission(session, "orders.update");
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      customer: true,
      deliveryZone: true,
    },
  });
  if (!order) notFound();
  const pendingPay = order.payments.find((p) => p.status === "PENDING");
  const paid = order.payments.some((p) => p.status === "COMPLETED");

  return (
    <div className="max-w-3xl">
      <p className="text-sm">
        <Link href="/admin/commandes" className="underline">
          ← Commandes
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">{order.number}</h1>
      <p className="mt-2 text-sm text-black/55">
        {formatWhen(order.createdAt)} · {ORDER_STATUS_LABELS[order.status]} · {formatCfa(order.total)}
      </p>

      <section className="mt-6 rounded-2xl bg-cream p-5">
        <h2 className="font-serif text-2xl">Client & livraison</h2>
        <p className="mt-2 text-sm">
          {order.customer
            ? `${order.customer.firstName} ${order.customer.lastName}`
            : order.shippingName || "Invité"}
        </p>
        <p className="text-sm text-black/60">{order.shippingPhone || order.customer?.phone || "—"}</p>
        <p className="mt-2 text-sm">
          {order.fulfillment === "DELIVERY" ? "Livraison" : "Retrait boutique"}
          {order.deliveryZone ? ` · ${order.deliveryZone.name}` : ""}
        </p>
        {order.shippingAddress ? (
          <p className="mt-1 text-sm text-black/60">
            {order.shippingAddress}
            {order.shippingCity ? `, ${order.shippingCity}` : ""}
          </p>
        ) : null}
        {order.customer ? (
          <Link href={`/admin/clients/${order.customer.id}`} className="mt-3 inline-block text-sm underline">
            Fiche cliente
          </Link>
        ) : null}
      </section>

      <ul className="mt-6 space-y-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between rounded-2xl border border-[#eee0e6] bg-white px-4 py-3">
            <span>
              {item.productName}
              {item.variantName ? ` · ${item.variantName}` : ""} × {item.quantity}
            </span>
            <span>{formatCfa(item.total)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1 text-sm text-black/60">
        <p className="flex justify-between">
          <span>Sous-total</span>
          <span>{formatCfa(order.subtotal)}</span>
        </p>
        {order.discount > 0 ? (
          <p className="flex justify-between">
            <span>Remise {order.couponCode ? `(${order.couponCode})` : ""}</span>
            <span>−{formatCfa(order.discount)}</span>
          </p>
        ) : null}
        <p className="flex justify-between">
          <span>Livraison</span>
          <span>{formatCfa(order.shippingFee)}</span>
        </p>
        <p className="flex justify-between font-serif text-2xl text-wine">
          <span>Total</span>
          <span>{formatCfa(order.total)}</span>
        </p>
      </div>

      <section className="mt-6 rounded-2xl bg-cream p-5">
        <h2 className="font-serif text-2xl">Paiement</h2>
        {order.payments.map((p) => (
          <p key={p.id} className="mt-2 text-sm">
            {PAYMENT_LABELS[p.method] ?? p.method} · {formatCfa(p.amount)} · {p.status}
            {p.reference ? ` · ${p.reference}` : ""}
          </p>
        ))}
        {!order.payments.length ? <p className="mt-2 text-sm text-black/50">Aucun paiement.</p> : null}
        {paid ? <p className="mt-2 text-sm text-emerald-800">Encaissé.</p> : null}
      </section>

      {canUpdate ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {pendingPay ? (
            <form action={collectOrderPayment}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">
                Encaisser {formatCfa(pendingPay.amount)}
              </button>
            </form>
          ) : null}
          <form action={changeOrderStatus} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="orderId" value={order.id} />
            <select name="status" defaultValue={order.status} className="rounded-xl border px-3 py-2 text-sm">
              {[order.status, ...ORDER_TRANSITIONS[order.status]]
                .filter((s, i, a) => a.indexOf(s) === i)
                .map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
            </select>
            <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Mettre à jour</button>
          </form>
        </div>
      ) : null}

      <form action={updateOrderNotes} className="mt-6 rounded-2xl bg-cream p-5">
        <h2 className="font-serif text-2xl">Notes internes</h2>
        <input type="hidden" name="orderId" value={order.id} />
        <textarea
          name="notes"
          defaultValue={order.notes ?? ""}
          rows={3}
          className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="Note d’équipe…"
        />
        <button className="mt-3 rounded-full bg-brown px-4 py-2 text-sm text-cream">Enregistrer la note</button>
      </form>
    </div>
  );
}
