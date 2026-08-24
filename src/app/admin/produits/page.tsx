import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { ProductForm } from "@/components/admin/product-form";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import Link from "next/link";

export default async function ProductsAdminPage() {
  await requireStaff("products.view");
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { variants: { where: { deletedAt: null }, take: 1 }, category: true, images: { take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">Produits</h1>
      <p className="mt-2 text-sm text-black/60">
        Nom + prix suffisent. Le SKU peut rester vide, il sera créé automatiquement.
      </p>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
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
                <td className="p-3">
                  <Link href={`/produit/${p.slug}`}>{p.name}</Link>
                </td>
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
