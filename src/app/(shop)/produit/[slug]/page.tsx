import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { addToCart } from "@/app/actions/shop";
import { ProductGallery } from "@/components/shop/product-gallery";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { catalogPhotoFor } from "@/lib/product-photos";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: { where: { isActive: true, deletedAt: null } },
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product || product.deletedAt || !product.onlineVisible) notFound();
  const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  if (!variant) notFound();

  const gallery = product.images.length
    ? product.images.map((m) => ({ id: m.id, url: m.url, alt: m.alt, kind: m.kind }))
    : [{ id: "catalog", url: catalogPhotoFor(product.slug, product.name), alt: product.name, kind: "IMAGE" as const }];

  async function add() {
    "use server";
    await addToCart(variant.id, 1);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <ProductGallery name={product.name} media={gallery} />
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold">{product.category?.name}</p>
        <h1 className="mt-2 font-serif text-5xl text-wine">{product.name}</h1>
        <p className="mt-4 text-black/70">{product.description ?? product.shortDescription}</p>
        <p className="mt-6 font-serif text-4xl">{formatCfa(unitPrice(variant))}</p>
        <div className="mt-6 space-y-2 text-sm">
          {product.variants.map((v) => (
            <p key={v.id}>
              {v.name} · {v.sku} · {formatCfa(unitPrice(v))}
            </p>
          ))}
        </div>
        <AddToCartButton action={add} />
      </div>
    </div>
  );
}
