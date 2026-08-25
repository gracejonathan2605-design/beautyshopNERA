import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { saveCoupon, saveDeliveryZone } from "@/app/actions/ops";
import { AdminFlash } from "@/components/admin/flash";
import { formatCfa } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";

export default async function PromosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("promotions.manage");
  const { ok, erreur } = await searchParams;
  const canManage = hasPermission(session, "promotions.manage");
  const [coupons, zones] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.deliveryZone.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">Promos & livraison</h1>
      <AdminFlash ok={ok} erreur={erreur} />

      <h2 className="mt-8 font-serif text-2xl">Codes promo</h2>
      {canManage ? (
        <form action={saveCoupon} className="mt-4 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-5">
          <input name="code" required placeholder="Code (NERA10)" className="rounded-xl border px-3 py-2 uppercase" />
          <select name="type" className="rounded-xl border px-3 py-2">
            <option value="PERCENT">% </option>
            <option value="FIXED">Montant fixe</option>
          </select>
          <input name="value" required placeholder="Valeur" className="rounded-xl border px-3 py-2" />
          <input name="minAmount" placeholder="Minimum FCFA" className="rounded-xl border px-3 py-2" />
          <input name="maxUses" placeholder="Max utilisations" className="rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-brown py-2 text-cream md:col-span-5">Créer le code</button>
        </form>
      ) : null}
      <ul className="mt-4 space-y-2">
        {coupons.map((c) => (
          <li key={c.id} className="rounded-2xl bg-cream p-4">
            <form action={saveCoupon} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={c.id} />
              <input name="code" defaultValue={c.code} className="w-28 rounded-lg border px-2 py-1 uppercase" />
              <select name="type" defaultValue={c.type} className="rounded-lg border px-2 py-1">
                <option value="PERCENT">%</option>
                <option value="FIXED">Fixe</option>
              </select>
              <input name="value" defaultValue={c.value} className="w-20 rounded-lg border px-2 py-1" />
              <input name="minAmount" defaultValue={c.minAmount} className="w-24 rounded-lg border px-2 py-1" />
              <input
                name="maxUses"
                defaultValue={c.maxUses ?? ""}
                placeholder="Max"
                className="w-16 rounded-lg border px-2 py-1"
              />
              <label className="flex items-center gap-1">
                <input type="checkbox" name="isActive" defaultChecked={c.isActive} /> Actif
              </label>
              <span className="text-black/45">
                {c.usedCount} usage{c.usedCount > 1 ? "s" : ""}
              </span>
              <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">OK</button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-serif text-2xl">Zones de livraison</h2>
      {canManage ? (
        <form action={saveDeliveryZone} className="mt-4 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-3">
          <input name="name" required placeholder="Quartier / zone" className="rounded-xl border px-3 py-2" />
          <input name="fee" required placeholder="Frais FCFA" className="rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-brown py-2 text-cream">Ajouter la zone</button>
        </form>
      ) : null}
      <ul className="mt-4 space-y-2">
        {zones.map((z) => (
          <li key={z.id} className="rounded-2xl bg-cream p-4">
            <form action={saveDeliveryZone} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={z.id} />
              <input name="name" defaultValue={z.name} className="rounded-lg border px-2 py-1" />
              <input name="fee" defaultValue={z.fee} className="w-28 rounded-lg border px-2 py-1" />
              <span className="text-black/45">{formatCfa(z.fee)}</span>
              <label className="flex items-center gap-1">
                <input type="checkbox" name="isActive" defaultChecked={z.isActive} /> Active
              </label>
              <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">OK</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
