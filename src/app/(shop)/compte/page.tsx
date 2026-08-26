import { getCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";
import { logoutCustomer } from "@/app/actions/auth";
import { reorderFromOrder } from "@/app/actions/shop";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ORDER_STATUS_LABELS } from "@/lib/status-labels";
import { orderConfirmationPath } from "@/lib/order-access";
import { AccountProfileForm } from "@/components/shop/account-profile-form";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/compte/connexion");
  const { erreur } = await searchParams;
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { items: { select: { id: true } } },
      },
    },
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
      <p className="mt-2 text-black/60">
        {customer.email} · {customer.phone || "Pas de téléphone"}
      </p>
      {erreur === "rupture" ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ces articles sont en rupture. Ils restent visibles en boutique : bientôt de retour.
        </p>
      ) : null}
      {erreur === "commande" ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cette commande est introuvable sur votre compte.
        </p>
      ) : null}

      <h2 className="mt-10 font-serif text-3xl">Profil et adresses</h2>
      <p className="mt-2 text-sm text-black/50">
        Ces informations préremplissent le checkout. L’adresse sert pour la livraison sous 24h.
      </p>
      <AccountProfileForm customer={customer} />

      <h2 className="mt-10 font-serif text-3xl">Commandes</h2>
      {customer.orders.length === 0 ? (
        <p className="mt-4 text-sm text-black/50">Aucune commande pour le moment.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {customer.orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-[#eee0e6] bg-cream p-4">
              <Link href={orderConfirmationPath(order.number)} className="flex justify-between gap-3">
                <span>
                  {order.number} · {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
                <span>{formatCfa(order.total)}</span>
              </Link>
              {order.shippingAddress ? (
                <p className="mt-2 text-xs text-black/45">
                  {order.shippingAddress}
                  {order.shippingCity ? `, ${order.shippingCity}` : ""}
                </p>
              ) : null}
              {order.items.length ? (
                <form action={reorderFromOrder} className="mt-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="rounded-full border border-[#eee0e6] bg-white px-4 py-2 text-sm text-wine">
                    Commander à nouveau
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
