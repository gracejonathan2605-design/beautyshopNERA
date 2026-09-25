import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { getHomeCatalog, getActiveFlashProducts, getCachedPartnerBrands } from "@/lib/catalog-cache";
import { PartnerBrandsSection } from "@/components/shop/partner-brands-section";
import { HeroProducts } from "@/components/brand/logo";
import { FlashSection } from "@/components/shop/flash-section";
import { HomeIdentity } from "@/components/shop/home-identity";
import { ShopFaq } from "@/components/shop/shop-faq";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { PRODUCT_GRID_HOME_CLASS, SHOP_IMAGE_QUALITY } from "@/lib/image-limits";
import { ProductPhoto } from "@/components/shop/product-photo";
import { coverByRayon, MECHES_HREF, pickForParents, POUR_MOI, SHOP_HERO_LINE, SHOP_TRUST_LINE } from "@/lib/shop-faces";

export const runtime = "nodejs";

export const metadata: Metadata = pageMetadata({
  title: "NERA Beauté & Shop | Boutique beauté à Yaoundé",
  description:
    "NERA Beauté & Shop, boutique de beauté à Yaoundé au Marché Neptune Ahala, face Skymotors. Cosmétiques, soins, cheveux, mèches, perruques, maquillage et parfums — magasin et e-commerce. Livraison disponible.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  let catalog: Awaited<ReturnType<typeof getHomeCatalog>> | null = null;
  let flash: Awaited<ReturnType<typeof getActiveFlashProducts>> = [];
  let partnerBrands: Awaited<ReturnType<typeof getCachedPartnerBrands>> = [];
  try {
    catalog = await getHomeCatalog();
  } catch {
    catalog = null;
  }
  try {
    flash = await getActiveFlashProducts(8);
  } catch {
    flash = [];
  }
  try {
    partnerBrands = await getCachedPartnerBrands();
  } catch {
    partnerBrands = [];
  }
  if (!catalog) {
    return (
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <HeroProducts />
          <h1 className="mt-6 font-serif text-5xl text-wine">{SHOP_HERO_LINE}</h1>
          <p className="mt-4 max-w-xl text-lg text-black/65">
            La boutique n’a pas pu charger le catalogue. Réessayez dans un instant, ou contactez-nous au{" "}
            {NERA_IDENTITY.phoneDisplay}.
          </p>
        </div>
      </section>
    );
  }

  const popular = new Set(catalog.popularIds);
  const covers = coverByRayon(catalog.looks);
  const flashIds = new Set(flash.map((p) => p.id));

  return (
    <div>
      <JsonLd
        data={webPageJsonLd({
          path: "/",
          name: "NERA Beauté & Shop | Boutique beauté à Yaoundé",
          description:
            "Boutique de beauté physique et e-commerce à Yaoundé, Marché Neptune Ahala, face Skymotors.",
        })}
      />
      <section className="px-4 pt-6">
        <div className="relative mx-auto max-w-6xl">
          <HeroProducts />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-linear-to-t from-wine/80 via-wine/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-10">
            <h1 className="max-w-xl font-serif text-4xl leading-[1.05] text-white md:text-6xl">{SHOP_HERO_LINE}</h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={MECHES_HREF} className="rounded-full bg-brown px-6 py-3 text-cream">
                Voir les mèches
              </Link>
              <Link href="/boutique" className="rounded-full bg-white px-6 py-3 text-wine">
                Entrer dans la boutique
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-6xl text-center text-sm text-wine/80">{SHOP_TRUST_LINE}</p>
      </section>

      {POUR_MOI.map((shelf) => {
        const items = pickForParents(catalog.looks, shelf.parents, 8).filter((item) => !flashIds.has(item.id));
        return (
          <section key={shelf.title} className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-serif text-4xl text-wine">{shelf.title}</h2>
              <Link href={shelf.href} className="text-sm text-wine underline decoration-wine/30 underline-offset-4">
                Voir la sélection
              </Link>
            </div>
            {items.length ? (
              <div className={`${PRODUCT_GRID_HOME_CLASS} mt-6`}>
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} oftenChosen={popular.has(product.id)} />
                ))}
              </div>
            ) : (
              <Link href={shelf.href} className="mt-4 inline-block text-sm text-wine underline decoration-wine/30">
                Ouvrir {shelf.title}
              </Link>
            )}
          </section>
        );
      })}

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-serif text-4xl text-wine">Univers NERA</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.categories.map((category) => {
            const cover = covers.get(category.slug);
            return (
              <Link
                key={category.id}
                href={`/categorie/${category.slug}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-blush sm:aspect-[5/4]"
              >
                <ProductPhoto
                  src={cover?.src}
                  alt={cover?.alt || category.name}
                  sizes="(max-width: 640px) 100vw, 33vw"
                  quality={SHOP_IMAGE_QUALITY}
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-wine/80 to-transparent p-4 font-serif text-3xl text-white">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <FlashSection products={flash} />
      <PartnerBrandsSection brands={partnerBrands} />
      <HomeIdentity />
      <ShopFaq />
    </div>
  );
}
