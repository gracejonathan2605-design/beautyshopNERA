import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { getHomeCatalog, getActiveFlashProducts, getCachedPartnerBrands } from "@/lib/catalog-cache";
import { PartnerBrandsSection } from "@/components/shop/partner-brands-section";
import { FlashSection } from "@/components/shop/flash-section";
import { MaisonHero } from "@/components/shop/maison-hero";
import { HomeIdentity } from "@/components/shop/home-identity";
import { ShopFaq } from "@/components/shop/shop-faq";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { PRODUCT_GRID_HOME_CLASS, SHOP_IMAGE_QUALITY } from "@/lib/image-limits";
import { ProductPhoto } from "@/components/shop/product-photo";
import { coverByRayon, pickForParents, POUR_MOI } from "@/lib/shop-faces";

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
      <MaisonHero
        notice={`La boutique n’a pas pu charger le catalogue. Réessayez dans un instant, ou contactez-nous au ${NERA_IDENTITY.phoneDisplay}.`}
      />
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
      <MaisonHero />

      {POUR_MOI.map((shelf) => {
        const items = pickForParents(catalog.looks, shelf.parents, 8).filter((item) => !flashIds.has(item.id));
        return (
          <section key={shelf.title} className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-gold">Choisir</p>
                <h2 className="mt-1 font-serif text-4xl text-wine md:text-5xl">{shelf.title}</h2>
              </div>
              <Link href={shelf.href} className="text-sm text-wine underline decoration-gold/50 underline-offset-4">
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
        <p className="text-[10px] uppercase tracking-[0.28em] text-gold">Les rayons</p>
        <h2 className="mt-1 font-serif text-4xl text-wine md:text-5xl">Univers NERA</h2>
        <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
          {catalog.categories.map((category) => {
            const cover = covers.get(category.slug);
            return (
              <Link
                key={category.id}
                href={`/categorie/${category.slug}`}
                className="group relative aspect-[3/4] w-[78%] shrink-0 snap-start overflow-hidden bg-wine md:aspect-[4/5] md:w-auto"
              >
                <ProductPhoto
                  src={cover?.src}
                  alt={cover?.alt || category.name}
                  sizes="(max-width: 768px) 70vw, 33vw"
                  quality={SHOP_IMAGE_QUALITY}
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-linear-to-t from-wine via-wine/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5 font-serif text-3xl text-cream sm:text-4xl">
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
