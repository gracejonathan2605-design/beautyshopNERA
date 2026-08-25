import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { saveSupplier } from "@/app/actions/ops";
import { AdminFlash } from "@/components/admin/flash";
import { hasPermission } from "@/lib/permissions";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("suppliers.view");
  const { ok, erreur } = await searchParams;
  const canManage = hasPermission(session, "suppliers.manage");
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Fournisseurs</h1>
      <AdminFlash ok={ok} erreur={erreur} />
      {canManage ? (
        <form action={saveSupplier} className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-2">
          <input name="name" required placeholder="Nom *" className="rounded-xl border px-3 py-2" />
          <input name="phone" placeholder="Téléphone" className="rounded-xl border px-3 py-2" />
          <input name="email" type="email" placeholder="Email" className="rounded-xl border px-3 py-2" />
          <input name="city" placeholder="Ville" className="rounded-xl border px-3 py-2" />
          <input name="address" placeholder="Adresse" className="rounded-xl border px-3 py-2 md:col-span-2" />
          <input name="notes" placeholder="Notes" className="rounded-xl border px-3 py-2 md:col-span-2" />
          <button className="rounded-full bg-brown py-2 text-cream md:col-span-2">Créer le fournisseur</button>
        </form>
      ) : null}
      <ul className="mt-6 space-y-2">
        {suppliers.map((s) => (
          <li key={s.id} className="rounded-2xl bg-cream p-4">
            {canManage ? (
              <form action={saveSupplier} className="grid gap-2 md:grid-cols-2">
                <input type="hidden" name="id" value={s.id} />
                <input name="name" defaultValue={s.name} className="rounded-lg border px-2 py-1" />
                <input name="phone" defaultValue={s.phone ?? ""} placeholder="Tél" className="rounded-lg border px-2 py-1" />
                <input name="email" defaultValue={s.email ?? ""} placeholder="Email" className="rounded-lg border px-2 py-1" />
                <input name="city" defaultValue={s.city ?? ""} placeholder="Ville" className="rounded-lg border px-2 py-1" />
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={s.isActive} /> Actif
                </label>
                <p className="text-xs text-black/45">{s.code}</p>
                <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">OK</button>
              </form>
            ) : (
              <p>
                {s.name} · {s.code}
                {s.phone ? ` · ${s.phone}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
