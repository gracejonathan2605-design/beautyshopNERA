import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { saveProduct } from "@/app/actions/admin";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import Link from "next/link";

export default async function ProductsAdminPage() {
  await requireStaff("products.view");
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { variants: { where: { deletedAt: null }, take: 1 }, category: true, images: { take: 1 } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">Produits</h1>
      <form action={saveProduct} encType="multipart/form-data" className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-4">
        <input name="name" required placeholder="Nom" className="rounded-xl border px-3 py-2" />
        <input name="sku" required placeholder="SKU" className="rounded-xl border px-3 py-2" />
        <input name="salePrice" type="number" required placeholder="Prix vente" className="rounded-xl border px-3 py-2" />
        <input name="costPrice" type="number" placeholder="Prix achat" className="rounded-xl border px-3 py-2" />
        <input name="stock" type="number" placeholder="Stock initial" className="rounded-xl border px-3 py-2" />
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="rounded-xl border px-3 py-2 text-sm" />
        <select name="categoryId" className="rounded-xl border px-3 py-2">
          <option value="">Catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" /> Vedette</label>
        <button className="rounded-full bg-brown py-2 text-cream">Créer</button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-cream">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50">
              <th className="p-3">Produit</th>
              <th>Catégorie</th>
              <th>Prix</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-black/5">
                <td className="p-3"><Link href={`/produit/${p.slug}`}>{p.name}</Link></td>
                <td>{p.category?.name}</td>
                <td>{p.variants[0] ? formatCfa(unitPrice(p.variants[0])) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
