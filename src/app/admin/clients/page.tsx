import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { formatCfa } from "@/lib/money";
import { saveCustomer } from "@/app/actions/admin";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";

export default async function CustomersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; ok?: string }>;
}) {
  const session = await requireStaff("customers.view");
  const q = await searchParams;
  const notice = q.erreur
    ? ({ kind: "erreur" as const, text: q.erreur })
    : q.ok
      ? ({ kind: "ok" as const, text: q.ok })
      : null;
  const canCreate = hasPermission(session, "customers.create");
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Clients</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Enregistrez une cliente (nom + WhatsApp). Elle apparaît ici et peut être retrouvée à la caisse.
      </p>
      {notice ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            notice.kind === "erreur"
              ? "border border-red-200 bg-red-50 text-red-800"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          role={notice.kind === "erreur" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      ) : null}

      {canCreate ? (
        <form action={saveCustomer} className="mt-6 rounded-2xl border border-[#eee0e6] bg-white p-5">
          <h2 className="font-serif text-2xl text-wine">Créer un client</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="firstName" required placeholder="Prénom *" className="rounded-xl border px-3 py-2" />
            <input name="lastName" placeholder="Nom" className="rounded-xl border px-3 py-2" />
            <input name="phone" required placeholder="WhatsApp *" className="rounded-xl border px-3 py-2" />
            <input name="email" type="email" placeholder="Email (optionnel)" className="rounded-xl border px-3 py-2" />
            <input name="city" placeholder="Ville" className="rounded-xl border px-3 py-2" />
            <input name="address" placeholder="Adresse" className="rounded-xl border px-3 py-2" />
          </div>
          <button className="mt-4 rounded-full bg-brown px-5 py-2 text-cream">Créer le client</button>
        </form>
      ) : null}

      {customers.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#eee0e6] bg-white p-8">
          <p className="font-medium text-wine">Aucun client pour le moment</p>
          <p className="mt-2 text-sm text-black/55">Créez la première cliente avec le formulaire ci-dessus.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {customers.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream p-4">
              <div>
                <p className="font-medium">
                  <Link href={`/admin/clients/${c.id}`} className="underline">
                    {c.firstName} {c.lastName}
                  </Link>
                </p>
                <p className="text-sm text-black/50">
                  {c.code}
                  {c.phone ? ` · ${c.phone}` : ""}
                  {c.email ? ` · ${c.email}` : ""}
                  {c.city ? ` · ${c.city}` : ""}
                </p>
              </div>
              <span className="text-sm text-black/50">{formatCfa(c.totalSpent)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
