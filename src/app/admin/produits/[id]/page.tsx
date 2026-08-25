import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { deleteProductMedia } from "@/app/actions/admin";
import { saveProductVariant, toggleProductPublish } from "@/app/actions/ops";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { groupCategoriesForSelect } from "@/lib/catalog";
import { AdminFlash } from "@/components/admin/flash";
import Image from "next/image";

export default async function ProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  await requireStaff("products.update");
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const [product, categories, brands, suppliers] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product || product.deletedAt) notFound();
  const variant = product.variants[0];
  const photos = product.images.filter((m) => m.kind === "IMAGE");
  const video = product.images.find((m) => m.kind === "VIDEO");

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl">Modifier {product.name}</h1>
      <p className="mt-2 text-sm text-black/50">SKU {variant?.sku}</p>
      <AdminFlash ok={ok} erreur={erreur} />
      <form action={toggleProductPublish} className="mt-4">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="publish" value={product.onlineVisible ? "0" : "1"} />
        <button className="rounded-full border px-4 py-2 text-sm">
          {product.onlineVisible ? "Dépublier de la boutique" : "Publier en boutique"}
        </button>
      </form>
      <ProductEditForm
        productId={product.id}
        name={product.name}
        categoryId={product.categoryId ?? ""}
        salePrice={variant?.salePrice ?? 0}
        costPrice={variant?.costPrice ?? 0}
        promoPrice={variant?.promoPrice ?? null}
        shortDescription={product.shortDescription ?? ""}
        isFeatured={product.isFeatured}
        isPromo={product.isPromo}
        isNew={product.isNew}
        onlineVisible={product.onlineVisible}
        barcode={variant?.barcode ?? ""}
        brandId={product.brandId ?? ""}
        supplierId={product.supplierId ?? ""}
        photoCount={photos.length}
        hasVideo={Boolean(video)}
        categoryGroups={groupCategoriesForSelect(categories)}
        brands={brands}
        suppliers={suppliers}
      />

      <h2 className="mt-10 font-serif text-2xl">Variantes</h2>
      <p className="mt-1 text-sm text-black/50">Couleur, longueur, pointure… Code-barres par variante.</p>
      <ul className="mt-4 space-y-3">
        {product.variants.map((v) => (
          <li key={v.id} className="rounded-2xl bg-cream p-4">
            <form action={saveProductVariant} className="grid gap-2 md:grid-cols-5">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="variantId" value={v.id} />
              <input name="name" defaultValue={v.name} className="rounded-lg border px-2 py-1" />
              <input name="salePrice" defaultValue={v.salePrice} className="rounded-lg border px-2 py-1" />
              <input name="promoPrice" defaultValue={v.promoPrice ?? ""} placeholder="Promo" className="rounded-lg border px-2 py-1" />
              <input name="costPrice" defaultValue={v.costPrice} placeholder="Achat" className="rounded-lg border px-2 py-1" />
              <input name="barcode" defaultValue={v.barcode ?? ""} placeholder="Code-barres" className="rounded-lg border px-2 py-1" />
              <p className="text-xs text-black/45 md:col-span-4">SKU {v.sku}</p>
              <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">Enregistrer</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveProductVariant} className="mt-4 grid gap-2 rounded-2xl border border-dashed border-[#eee0e6] p-4 md:grid-cols-5">
        <input type="hidden" name="productId" value={product.id} />
        <input name="name" placeholder="Nouvelle variante (ex. Noir 30 cm)" className="rounded-lg border px-2 py-1" />
        <input name="salePrice" required placeholder="Prix vente" className="rounded-lg border px-2 py-1" />
        <input name="promoPrice" placeholder="Promo" className="rounded-lg border px-2 py-1" />
        <input name="barcode" placeholder="Code-barres" className="rounded-lg border px-2 py-1" />
        <input name="stock" placeholder="Stock initial" className="rounded-lg border px-2 py-1" />
        <button className="rounded-full bg-brown px-3 py-2 text-sm text-cream md:col-span-5">Ajouter la variante</button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {product.images.map((m) => (
          <figure key={m.id} className="rounded-2xl bg-cream p-2">
            {m.kind === "VIDEO" ? (
              <video src={m.url} className="h-32 w-full rounded-xl object-cover" preload="metadata" />
            ) : (
              <div className="relative h-32 overflow-hidden rounded-xl">
                <Image src={m.url} alt={m.alt ?? ""} fill className="object-cover" sizes="200px" loading="lazy" />
              </div>
            )}
            <form action={deleteProductMedia} className="mt-2 text-center">
              <input type="hidden" name="mediaId" value={m.id} />
              <button className="text-xs text-red-700">Retirer</button>
            </form>
          </figure>
        ))}
      </div>
    </div>
  );
}
