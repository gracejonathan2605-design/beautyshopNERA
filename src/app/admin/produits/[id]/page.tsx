import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { deleteProductMedia } from "@/app/actions/admin";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { groupCategoriesForSelect } from "@/lib/catalog";
import Image from "next/image";

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("products.update");
  const { id } = await params;
  const [product, categories] = await Promise.all([
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
  ]);
  if (!product || product.deletedAt) notFound();
  const variant = product.variants[0];
  const photos = product.images.filter((m) => m.kind === "IMAGE");
  const video = product.images.find((m) => m.kind === "VIDEO");

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl">Modifier {product.name}</h1>
      <p className="mt-2 text-sm text-black/50">SKU {variant?.sku}</p>
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
        photoCount={photos.length}
        hasVideo={Boolean(video)}
        categoryGroups={groupCategoriesForSelect(categories)}
      />
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
