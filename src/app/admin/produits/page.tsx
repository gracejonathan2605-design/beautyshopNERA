import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { ProductForm } from "@/components/admin/product-form";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { groupCategoriesForSelect } from "@/lib/catalog";
import { isFlashActive } from "@/lib/flash";
import { hasPermission } from "@/lib/permissions";
import Image from "next/image";
import Link from "next/link";

export default async function ProductsAdminPage() {
  const session = await requireStaff("products.view");
  const canCreate = hasPermission(session, "products.create");
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
        Pour plusieurs articles :{" "}
        <Link href="/admin/produits/lot" className="text-brown underline">
          publier 10–15 produits
        </Link>
        , compléter chaque fiche, puis publier d’un coup. Les photos sont compressées automatiquement.
      </p>
      {canCreate ? (
        <Link
          href="/admin/produits/lot"
          className="mt-6 flex flex-col gap-1 rounded-2xl border border-gold bg-gold/15 p-5 transition hover:bg-gold/25 md:flex-row md:items-center md:justify-between"
        >
          <span>
            <span className="block font-serif text-2xl text-wine">Publier 10–15 produits</span>
            <span className="mt-1 block text-sm text-black/60">
              Plusieurs photos d’un coup, une fiche par image, publication en une opération.
            </span>
          </span>
          <span className="mt-3 inline-flex rounded-full bg-brown px-5 py-2 text-sm font-semibold text-cream md:mt-0">
            Ouvrir le lot
          </span>
        </Link>
      ) : null}
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
              <th>FLASH</th>
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
                <td>
                  {isFlashActive(p) ? (
                    <span className="rounded-full bg-blush px-2 py-0.5 text-[11px] uppercase tracking-wide text-wine">
                      Actif
                    </span>
                  ) : p.flashStartAt && p.flashEndAt ? (
                    <span className="text-black/40">Terminé</span>
                  ) : (
                    <span className="text-black/30">—</span>
                  )}
                </td>
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
