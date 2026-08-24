import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/shop/product-card";
import { productCardInclude } from "@/lib/product-query";

export default async function BoutiquePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      onlineVisible: true,
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: productCardInclude,
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-5xl">Boutique</h1>
      <form className="mt-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un produit"
          className="w-full rounded-full border border-black/10 bg-cream px-5 py-3"
        />
      </form>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
