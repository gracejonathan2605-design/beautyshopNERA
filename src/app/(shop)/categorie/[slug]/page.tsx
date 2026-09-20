import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { getCachedCategoryPage } from "@/lib/catalog-cache";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { CatalogPagination, CatalogToolbar } from "@/components/shop/catalog-toolbar";
import { ShopBreadcrumbs } from "@/components/shop/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { browseShopProducts, countShopProducts, descendantCategoryIds, parseBrowseQuery } from "@/lib/shop-browse";
import { breadcrumbJsonLd, categoryIntro, collectionJsonLd, pageMetadata } from "@/lib/seo";
import { categoryPageTitle } from "@/lib/category-seo";
import { PRODUCT_GRID_CLASS } from "@/lib/image-limits";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; vue?: string; tri?: string; page?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const data = await getCachedCategoryPage(slug);
  const query = parseBrowseQuery({ ...raw, rayon: slug });
  if (!data) {
    return pageMetadata({ title: "Catégorie", description: "Rayon NERA Beauté & Shop.", path: `/categorie/${slug}`, index: false, follow: true });
  }
  const intro = categoryIntro(data.category.name, data.category.description, {
    slug: data.category.slug,
    parentName: data.category.parent?.name,
  });
  const categoryIds = await descendantCategoryIds(data.category.id);
  const total = await countShopProducts(categoryIds);
  const indexable = !query.q && query.vue === "all" && query.page <= 1 && total > 0;
  return pageMetadata({
    title: categoryPageTitle(data.category.name, data.category.slug, !data.category.parent),
    description: intro,
    path: `/categorie/${data.category.slug}`,
    index: indexable,
    follow: true,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const data = await getCachedCategoryPage(slug);
  if (!data) notFound();
  const { category } = data;
  const query = parseBrowseQuery({ ...raw, rayon: slug });
  const categoryIds = await descendantCategoryIds(category.id);
  const result = await browseShopProducts(query, categoryIds);
  const intro = categoryIntro(category.name, category.description, {
    slug: category.slug,
    parentName: category.parent?.name,
  });
  const indexable = !query.q && query.vue === "all" && query.page <= 1 && result.total > 0;
  const crumbs = [
    { name: "Accueil", path: "/" },
    { name: "Boutique", path: "/boutique" },
    ...(category.parent ? [{ name: category.parent.name, path: `/categorie/${category.parent.slug}` }] : []),
    { name: category.name, path: `/categorie/${category.slug}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      {indexable ? (
        <JsonLd
          data={collectionJsonLd({
            path: `/categorie/${category.slug}`,
            name: category.name,
            description: intro,
            items: result.items.map((product) => ({ name: product.name, path: `/produit/${product.slug}` })),
          })}
        />
      ) : null}
      <ShopBreadcrumbs
        items={[
          { name: "Accueil", href: "/" },
          { name: "Boutique", href: "/boutique" },
          ...(category.parent ? [{ name: category.parent.name, href: `/categorie/${category.parent.slug}` }] : []),
          { name: category.name },
        ]}
      />
      <h1 className="mt-3 font-serif text-5xl">{category.name}</h1>
      <p className="mt-3 max-w-2xl text-black/60">{intro}</p>
      <div className="mt-5">
        <PayDeliveryBadges />
      </div>

      {category.children.length > 0 ? (
        <nav aria-label="Sous-rayons" className="mt-6 flex flex-wrap gap-1.5">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/categorie/${child.slug}`}
              className="max-w-full rounded-full border border-black/10 bg-cream px-3 py-1.5 text-xs hover:border-brown sm:text-sm"
            >
              {child.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <CatalogToolbar
        query={{ ...query, rayon: "" }}
        rayons={[]}
        basePath={`/categorie/${slug}`}
        hideRayon
      />

      {result.items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50">
          Aucun produit dans cette catégorie pour le moment.
        </p>
      ) : (
        <>
          <h2 className="mt-10 font-serif text-3xl text-wine">Dans ce rayon</h2>
          <div className={`mt-6 ${PRODUCT_GRID_CLASS}`}>
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
      <CatalogPagination
        query={{ ...query, rayon: "" }}
        page={result.page}
        pages={result.pages}
        total={result.total}
        basePath={`/categorie/${slug}`}
      />
    </div>
  );
}