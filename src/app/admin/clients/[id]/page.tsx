import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { formatCfa } from "@/lib/money";
import { ORDER_STATUS_LABELS, SALE_STATUS_LABELS } from "@/lib/status-labels";

function formatWhen(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("customers.view");
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 30 },
      sales: { orderBy: { createdAt: "desc" }, take: 30, include: { cashier: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!customer || customer.deletedAt) notFound();
  return (
    <div className="max-w-3xl">
      <p className="text-sm">
        <Link href="/admin/clients" className="underline">
          ← Clients
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">
        {customer.firstName} {customer.lastName}
      </h1>
      <p className="mt-2 text-sm text-black/55">
        {customer.code}
        {customer.phone ? ` · ${customer.phone}` : ""}
        {customer.email ? ` · ${customer.email}` : ""}
      </p>
      <p className="mt-1 text-sm text-black/50">
        {customer.address ? `${customer.address}, ` : ""}
        {customer.city ?? ""}
      </p>
      <p className="mt-3 font-serif text-2xl text-wine">Total {formatCfa(customer.totalSpent)}</p>

      <h2 className="mt-10 font-serif text-2xl">Commandes en ligne</h2>
      {customer.orders.length === 0 ? (
        <p className="mt-3 text-sm text-black/50">Aucune commande site.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {customer.orders.map((order) => (
            <li key={order.id}>
              <Link href={`/admin/commandes/${order.id}`} className="flex justify-between rounded-2xl bg-cream p-4">
                <span>
                  {order.number} · {ORDER_STATUS_LABELS[order.status]} · {formatWhen(order.createdAt)}
                </span>
                <span>{formatCfa(order.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-serif text-2xl">Ventes caisse</h2>
      {customer.sales.length === 0 ? (
        <p className="mt-3 text-sm text-black/50">Aucune vente POS.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {customer.sales.map((sale) => (
            <li key={sale.id} className="flex justify-between rounded-2xl bg-cream p-4">
              <span>
                {sale.number} · {SALE_STATUS_LABELS[sale.status]} · {formatWhen(sale.createdAt)}
                {sale.cashier ? ` · ${sale.cashier.firstName}` : ""}
              </span>
              <span>{formatCfa(sale.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
