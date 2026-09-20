import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { PartnerBrandMark } from "@/components/shop/partner-brands-section";
import { ShopBreadcrumbs } from "@/components/shop/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { absolutizeMediaUrl, breadcrumbJsonLd, collectionJsonLd, pageMetadata } from "@/lib/seo";
import {
  brandJsonLd,
  partnerBrandIntro,
  partnerBrandMetaDescription,
  partnerBrandPageTitle,
  partnerBrandPath,
} from "@/lib/partner-brands";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { PRODUCT_GRID_CLASS } from "@/lib/image-limits";
import { absoluteUrl } from "@/lib/site-url";
import {
  getPublicPartnerBrand,
  listBrandBestsellers,
  listBrandFeaturedProducts,
  listBrandNewProducts,
  listBrandOnlineProducts,
  productsForCollection,
} from "@/services/partner-brand.service";

export const runtime = "nodejs";
export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ collection?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getPublicPartnerBrand(slug).catch(() => null);
  if (!brand) {
    return pageMetadata({
      title: "Marque",
      description: `Marque proposée chez ${NERA_IDENTITY.name}.`,
      path: partnerBrandPath(slug),
      index: false,
      follow: true,
    });
  }
  return pageMetadata({
    title: partnerBrandPageTitle(brand.name),
    description: partnerBrandMetaDescription(brand),
    path: partnerBrandPath(brand.slug),
    image: brand.banner || brand.logo,
    absoluteTitle: true,
  });
}

export default async function PartnerBrandPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const brand = await getPublicPartnerBrand(slug).catch(() => null);
  if (!brand) notFound();
  const intro = partnerBrandIntro(brand);
  const collectionSlug = query.collection?.trim() || "";
  const activeCollection = brand.collections.find((row) => row.slug === collectionSlug) ?? null;
  const [allProducts, news, featured, popular, collectionProducts] = await Promise.all([
    listBrandOnlineProducts(brand.id),
    listBrandNewProducts(brand.id),
    listBrandFeaturedProducts(brand.id),
    listBrandBestsellers(brand.id),
    activeCollection
      ? productsForCollection({
          brandId: brand.id,
          kind: activeCollection.kind,
          categoryId: activeCollection.categoryId,
          collectionId: activeCollection.id,
        })
      : Promise.resolve(null),
  ]);
  const grid = collectionProducts ?? allProducts;
  const path = partnerBrandPath(brand.slug);
  const logo = absolutizeMediaUrl(brand.logo);
  const banner = brand.banner;

  return (
    <div>
      {banner ? (
        <div className="relative h-48 overflow-hidden bg-blush md:h-72">
          <Image src={banner} alt="" fill className="object-cover" sizes="100vw" priority />
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl px-4 py-10">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Marques partenaires", path: "/marques" },
            { name: brand.name, path },
          ])}
        />
        <JsonLd
          data={brandJsonLd({
            name: brand.name,
            slug: brand.slug,
            description: intro,
            logo,
            url: absoluteUrl(path),
          })}
        />
        <JsonLd
          data={collectionJsonLd({
            path,
            name: partnerBrandPageTitle(brand.name),
            description: intro,
            items: grid.map((product) => ({ name: product.name, path: `/produit/${product.slug}` })),
          })}
        />
        <ShopBreadcrumbs
          items={[
            { name: "Accueil", href: "/" },
            { name: "Marques", href: "/marques" },
            { name: brand.name },
          ]}
        />
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end">
          <PartnerBrandMark name={brand.name} logo={brand.logo} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Marque partenaire</p>
            <h1 className="mt-2 font-serif text-5xl text-wine">{brand.name}</h1>
            <p className="mt-2 text-sm uppercase tracking-[0.16em] text-black/40">× {NERA_IDENTITY.name}</p>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-black/65">{intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/boutique" className="rounded-full border border-[#eee0e6] bg-white px-6 py-3 text-wine">
            Toute la boutique NERA
          </Link>
          {grid[0] ? (
            <Link href={`/produit/${grid[0].slug}`} className="rounded-full bg-brown px-6 py-3 text-cream">
              Voir un produit
            </Link>
          ) : (
            <Link href="/boutique" className="rounded-full bg-brown px-6 py-3 text-cream">
              Acheter chez NERA
            </Link>
          )}
        </div>

        {brand.collections.length ? (
          <nav aria-label="Collections" className="mt-10 flex flex-wrap gap-2">
            <Link
              href={path}
              className={`rounded-full border px-4 py-2 text-sm ${activeCollection ? "border-[#eee0e6] bg-white text-wine" : "border-gold bg-gold/15 text-wine"}`}
            >
              Tous les produits
            </Link>
            {brand.collections.map((collection) => (
              <Link
                key={collection.id}
                href={`${path}?collection=${collection.slug}`}
                className={`rounded-full border px-4 py-2 text-sm ${activeCollection?.id === collection.id ? "border-gold bg-gold/15 text-wine" : "border-[#eee0e6] bg-white text-wine"}`}
              >
                {collection.name}
              </Link>
            ))}
          </nav>
        ) : null}

        <section className="mt-10">
          <h2 className="font-serif text-3xl text-wine">
            {activeCollection ? activeCollection.name : "Produits disponibles"}
          </h2>
          {activeCollection?.description ? (
            <p className="mt-2 text-sm text-black/55">{activeCollection.description}</p>
          ) : null}
          {grid.length ? (
            <div className={`${PRODUCT_GRID_CLASS} mt-6`}>
              {grid.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-[1.6rem] border border-[#eee0e6] bg-white/85 p-6 text-black/55">
              Les produits de cette marque apparaîtront ici dès qu’ils seront publiés et associés à {brand.name}.
            </p>
          )}
        </section>

        {!activeCollection && news.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-3xl text-wine">Nouveautés</h2>
            <div className={`${PRODUCT_GRID_CLASS} mt-6`}>
              {news.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        {!activeCollection && popular.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-3xl text-wine">Produits populaires</h2>
            <div className={`${PRODUCT_GRID_CLASS} mt-6`}>
              {popular.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        {!activeCollection && !popular.length && featured.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-3xl text-wine">Sélection</h2>
            <div className={`${PRODUCT_GRID_CLASS} mt-6`}>
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
