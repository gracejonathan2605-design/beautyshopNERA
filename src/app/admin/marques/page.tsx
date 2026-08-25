import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { saveBrand } from "@/app/actions/ops";
import { AdminFlash } from "@/components/admin/flash";
import { hasPermission } from "@/lib/permissions";

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("brands.view");
  const { ok, erreur } = await searchParams;
  const canManage = hasPermission(session, "brands.manage");
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Marques</h1>
      <AdminFlash ok={ok} erreur={erreur} />
      {canManage ? (
        <form action={saveBrand} className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-cream p-5">
          <input name="name" required placeholder="Nom de la marque" className="rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-brown px-4 py-2 text-cream">Ajouter</button>
        </form>
      ) : null}
      <ul className="mt-6 space-y-2">
        {brands.map((b) => (
          <li key={b.id} className="rounded-2xl bg-cream p-4">
            {canManage ? (
              <form action={saveBrand} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={b.id} />
                <input name="name" defaultValue={b.name} className="rounded-lg border px-2 py-1" />
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={b.isActive} /> Active
                </label>
                <span className="text-sm text-black/45">{b._count.products} produit(s)</span>
                <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">OK</button>
              </form>
            ) : (
              <p>
                {b.name} · {b._count.products} produit(s)
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
