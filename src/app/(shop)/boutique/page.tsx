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
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { shortDescription: { contains: q, mode: "insensitive" as const } },
              { category: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: productCardInclude,
    orderBy: { name: "asc" },
    take: 60,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Maison NERA</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Boutique</h1>
      <p className="mt-3 max-w-xl text-black/55">
        Soins, mèches, parfums et mode — une sélection claire, à feuilleter sans se presser.
      </p>
      <form className="mt-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un produit"
          className="w-full rounded-full border border-[#eee0e6] bg-white px-5 py-3"
        />
      </form>
      {q ? (
        <p className="mt-4 text-sm text-black/50">
          {products.length} résultat{products.length > 1 ? "s" : ""} pour « {q} »
        </p>
      ) : null}
      {products.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-[1.7rem] border border-dashed border-[#eee0e6] bg-white/70 p-10 text-center text-black/50">
          Aucun produit pour le moment{q ? " avec cette recherche" : ""}.
        </p>
      )}
    </div>
  );
}
