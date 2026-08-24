import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { saveStockAdjust } from "@/app/actions/admin";
import { formatCfa } from "@/lib/money";
import { availableQty } from "@/services/inventory.service";

export default async function StockAdminPage() {
  await requireStaff("stock.view");
  const rows = await prisma.inventory.findMany({
    include: { variant: { include: { product: true } }, location: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Stocks</h1>
      <form action={saveStockAdjust} className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-4">
        <select name="variantId" required className="rounded-xl border px-3 py-2">
          {rows.map((r) => (
            <option key={r.variantId} value={r.variantId}>
              {r.variant.product.name} — {r.variant.name}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" required placeholder="Qté (+/-)" className="rounded-xl border px-3 py-2" />
        <input name="comment" placeholder="Commentaire" className="rounded-xl border px-3 py-2" />
        <button className="rounded-full bg-brown py-2 text-cream">Ajuster</button>
      </form>
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
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-black/5 bg-cream">
              <td className="p-3">{r.variant.product.name} — {r.variant.name}</td>
              <td>{availableQty(r.onHand, r.reserved)}</td>
              <td>{r.reserved}</td>
              <td>{r.minQuantity}</td>
              <td>{formatCfa(r.variant.promoPrice ?? r.variant.salePrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
