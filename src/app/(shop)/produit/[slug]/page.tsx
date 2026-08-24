import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { addToCart } from "@/app/actions/shop";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { variants: { where: { isActive: true, deletedAt: null } }, category: true },
  });
  if (!product || product.deletedAt || !product.onlineVisible) notFound();
  const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  if (!variant) notFound();

  async function add() {
    "use server";
    await addToCart(variant.id, 1);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div className="flex min-h-80 items-end rounded-[2rem] bg-linear-to-br from-[#e8dcc8] to-[#c4a574] p-8">
        <h1 className="font-serif text-5xl text-brown">{product.name}</h1>
      </div>
      <div>
        <p className="text-sm uppercase tracking-widest text-black/50">{product.category?.name}</p>
        <p className="mt-4 text-black/70">{product.description ?? product.shortDescription}</p>
        <p className="mt-6 font-serif text-4xl">{formatCfa(unitPrice(variant))}</p>
        <div className="mt-6 space-y-2 text-sm">
          {product.variants.map((v) => (
            <p key={v.id}>
              {v.name} · {v.sku} · {formatCfa(unitPrice(v))}
            </p>
          ))}
        </div>
        <form action={add}>
          <button className="mt-8 rounded-full bg-brown px-8 py-3 text-cream">Ajouter au panier</button>
        </form>
      </div>
    </div>
  );
}
