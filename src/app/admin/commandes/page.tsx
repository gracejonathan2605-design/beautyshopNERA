import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { changeOrderStatus } from "@/app/actions/admin";
import { formatCfa } from "@/lib/money";
import { OrderStatus } from "@prisma/client";

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default async function OrdersAdminPage() {
  await requireStaff("orders.view");
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true },
    take: 100,
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Commandes</h1>
      <div className="mt-6 space-y-3">
        {orders.map((o) => (
          <form key={o.id} action={async (formData) => {
            "use server";
            await changeOrderStatus(o.id, String(formData.get("status")) as OrderStatus);
          }} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream p-4">
            <div>
              <p className="font-medium">{o.number}</p>
              <p className="text-sm text-black/50">{o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : "Invité"} · {formatCfa(o.total)}</p>
            </div>
            <select name="status" defaultValue={o.status} className="rounded-xl border px-3 py-2">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Mettre à jour</button>
          </form>
        ))}
      </div>
    </div>
  );
}
