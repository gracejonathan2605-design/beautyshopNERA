import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/shop/product-card";
import { productCardInclude } from "@/lib/product-query";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: true,
      products: {
        where: { status: "ACTIVE", onlineVisible: true, deletedAt: null },
        include: productCardInclude,
      },
    },
  });
  if (!category || category.deletedAt) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-5xl">{category.name}</h1>
      {category.description ? <p className="mt-3 max-w-2xl text-black/60">{category.description}</p> : null}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {category.products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
