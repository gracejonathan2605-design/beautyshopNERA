import { getCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";
import { logoutCustomer } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ORDER_STATUS_LABELS } from "@/lib/status-labels";

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/compte/connexion");
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!customer) redirect("/compte/connexion");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-5xl">Bonjour {customer.firstName}</h1>
        <form action={logoutCustomer}>
          <button className="text-sm">Déconnexion</button>
        </form>
      </div>
      <p className="mt-2 text-black/60">{customer.email} · {customer.phone}</p>
      <h2 className="mt-10 font-serif text-3xl">Commandes</h2>
      {customer.orders.length === 0 ? (
        <p className="mt-4 text-sm text-black/50">Aucune commande pour le moment.</p>
      ) : (
      <ul className="mt-4 space-y-3">
        {customer.orders.map((o) => (
          <li key={o.id}>
            <Link href={`/commande/${o.number}`} className="flex justify-between rounded-2xl bg-cream p-4">
              <span>{o.number} · {ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
              <span>{formatCfa(o.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
