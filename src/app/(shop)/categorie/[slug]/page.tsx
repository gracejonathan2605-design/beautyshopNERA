import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { getCachedCategoryPage } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCachedCategoryPage(slug);
  if (!data) notFound();
  const { category, products } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.3em] text-brown/70">
        {category.parent ? (
          <Link href={`/categorie/${category.parent.slug}`} className="hover:underline">
            {category.parent.name}
          </Link>
        ) : (
          "Catégorie"
        )}
      </p>
      <h1 className="mt-2 font-serif text-5xl">{category.name}</h1>
      {category.description ? (
        <p className="mt-3 max-w-2xl text-black/60">{category.description}</p>
      ) : null}

      {category.children.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/categorie/${child.slug}`}
              className="max-w-full rounded-full border border-black/10 bg-cream px-3 py-1.5 text-xs hover:border-brown sm:text-sm"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50">
          Aucun produit dans cette catégorie pour le moment.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getCachedCategoryPage(slug);
  return { title: data ? `${data.category.name} — NERA Beauté` : "Catégorie" };
}
