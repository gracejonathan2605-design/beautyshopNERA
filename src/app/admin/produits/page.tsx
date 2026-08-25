import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { ProductForm } from "@/components/admin/product-form";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { groupCategoriesForSelect } from "@/lib/catalog";
import Image from "next/image";
import Link from "next/link";

export default async function ProductsAdminPage() {
  await requireStaff("products.view");
  const [products, categories, brands, suppliers] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { variants: { where: { deletedAt: null }, take: 1 }, category: true, images: { where: { kind: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">Produits</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Remplissez le nom, le rayon et le prix, puis cliquez sur <strong>Publier le produit</strong>.
        Un écran « Publication en cours » s’affiche pendant la compression des photos. Le SKU est automatique.
        Le produit apparaît ensuite en boutique et à la caisse. Jusqu’à 5 photos et 1 vidéo de 40 s.
      </p>
      <ProductForm
        categoryGroups={groupCategoriesForSelect(categories)}
        brands={brands}
        suppliers={suppliers}
      />
      <div className="mt-6 overflow-x-auto rounded-2xl bg-cream">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50">
              <th className="p-3">Produit</th>
              <th>SKU</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-black/5">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.images[0] ? (
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#e8dcc8]">
                        <Image src={p.images[0].url} alt="" fill className="object-cover" sizes="40px" loading="lazy" />
                      </span>
                    ) : null}
                    <Link href={`/admin/produits/${p.id}`} className="underline">
                      {p.name}
                    </Link>
                    <span className="ml-2 text-xs text-black/40">
                      {p.onlineVisible ? "en ligne" : "dépublié"}
                    </span>
                  </div>
                </td>
                <td>{p.variants[0]?.sku}</td>
                <td>{p.category?.name ?? "—"}</td>
                <td>{p.variants[0] ? formatCfa(unitPrice(p.variants[0])) : "—"}</td>
                <td className="p-3">
                  <ProductRowActions
                    productId={p.id}
                    name={p.name}
                    variantId={p.variants[0]?.id ?? null}
                    salePrice={p.variants[0]?.salePrice ?? 0}
                    published={p.onlineVisible}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
