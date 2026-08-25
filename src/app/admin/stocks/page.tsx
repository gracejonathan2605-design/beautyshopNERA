import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { saveStockAdjust } from "@/app/actions/admin";
import { saveStockPurchase } from "@/app/actions/ops";
import { formatCfa } from "@/lib/money";
import { availableQty } from "@/services/inventory.service";
import { unitPrice } from "@/lib/pricing";
import { hasPermission } from "@/lib/permissions";
import { AdminFlash } from "@/components/admin/flash";

export default async function StockAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("stock.view");
  const { ok, erreur } = await searchParams;
  const canAdjust = hasPermission(session, "stock.adjust");
  const canPurchase = hasPermission(session, "stock.purchase");
  const [rows, variants, suppliers, purchases] = await Promise.all([
    prisma.inventory.findMany({
      include: {
        variant: { select: { name: true, salePrice: true, promoPrice: true, sku: true, product: { select: { name: true } } } },
        location: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.productVariant.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, sku: true, product: { select: { name: true } } },
      orderBy: { product: { name: "asc" } },
      take: 400,
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.stockMovement.findMany({
      where: { type: "PURCHASE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { variant: { select: { name: true, product: { select: { name: true } } } }, supplier: { select: { name: true } } },
    }),
  ]);
  const options = variants.length ? variants : rows.map((r) => ({
    id: r.variantId,
    name: r.variant.name,
    sku: r.variant.sku,
    product: r.variant.product,
  }));
  return (
    <div>
      <h1 className="font-serif text-4xl">Stocks</h1>
      <AdminFlash ok={ok} erreur={erreur} />
      {canPurchase ? (
        <form action={saveStockPurchase} className="mt-6 grid gap-3 rounded-2xl border border-[#eee0e6] bg-white p-5 md:grid-cols-5">
          <h2 className="font-serif text-2xl md:col-span-5">Réception fournisseur</h2>
          <select name="variantId" required className="rounded-xl border px-3 py-2 md:col-span-2">
            {options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.product.name} — {v.name}
              </option>
            ))}
          </select>
          <input name="quantity" type="number" min={1} required placeholder="Quantité reçue" className="rounded-xl border px-3 py-2" />
          <select name="supplierId" className="rounded-xl border px-3 py-2">
            <option value="">Fournisseur</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="reference" placeholder="N° facture / BL" className="rounded-xl border px-3 py-2" />
          <input name="comment" placeholder="Commentaire" className="rounded-xl border px-3 py-2 md:col-span-3" />
          <button className="rounded-full bg-brown py-2 text-cream md:col-span-2">Enregistrer l’entrée</button>
        </form>
      ) : null}
      {canAdjust ? (
        <form action={saveStockAdjust} className="mt-4 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-4">
          <p className="text-sm text-black/55 md:col-span-4">Ajustement manuel (+ ajout / − perte)</p>
          <select name="variantId" required className="rounded-xl border px-3 py-2">
            {options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.product.name} — {v.name}
              </option>
            ))}
          </select>
          <input name="quantity" type="number" required placeholder="Qté (+/-)" className="rounded-xl border px-3 py-2" />
          <input name="comment" placeholder="Commentaire" className="rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-brown py-2 text-cream">Ajuster</button>
        </form>
      ) : null}
      {purchases.length ? (
        <div className="mt-6">
          <h2 className="font-serif text-2xl">Dernières réceptions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {purchases.map((m) => (
              <li key={m.id} className="rounded-xl bg-cream px-4 py-2">
                +{m.quantity} · {m.variant.product.name} — {m.variant.name}
                {m.supplier ? ` · ${m.supplier.name}` : ""}
                {m.reference ? ` · ${m.reference}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-left text-black/50">
            <th className="p-3">Produit</th>
            <th>Dispo</th>
            <th>Réservé</th>
            <th>Min</th>
            <th>Prix</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const dispo = availableQty(r.onHand, r.reserved);
            return (
              <tr key={r.id} className={`border-t border-black/5 bg-cream ${dispo <= r.minQuantity ? "text-wine" : ""}`}>
                <td className="p-3">
                  {r.variant.product.name} — {r.variant.name}
                  {dispo <= r.minQuantity ? <span className="ml-2 text-xs uppercase">Stock bas</span> : null}
                </td>
                <td>{dispo}</td>
                <td>{r.reserved}</td>
                <td>{r.minQuantity}</td>
                <td>{formatCfa(unitPrice(r.variant))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
