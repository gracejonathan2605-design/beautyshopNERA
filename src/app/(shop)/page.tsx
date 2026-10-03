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
import { RegistreTrustLink } from "@/components/shop/registre-commerce";
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
      <section className="px-4 pt-8 pb-16">
        <div className="relative mx-auto max-w-6xl">
          <HeroProducts className="ring-1 ring-gold/40" />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-linear-to-t from-wine via-wine/45 to-wine/10" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-10">
            <p className="text-[10px] uppercase tracking-[0.32em] text-champagne">Maison de beauté · Yaoundé</p>
            <h1 className="mt-3 max-w-xl font-serif text-4xl leading-[0.95] text-cream sm:text-5xl md:text-7xl">{SHOP_HERO_LINE}</h1>
            <p className="mt-4 max-w-lg text-sm text-cream/80">{SHOP_TRUST_LINE}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <Link href={MECHES_HREF} className="rounded-full bg-brown px-6 py-3 text-center text-cream">
                Voir les mèches
              </Link>
              <Link href="/boutique" className="rounded-full border border-cream/70 bg-cream px-6 py-3 text-center text-wine">
                Entrer dans la boutique
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-black/65">
          La boutique n’a pas pu charger le catalogue. Réessayez dans un instant, ou contactez-nous au{" "}
          {NERA_IDENTITY.phoneDisplay}.
        </p>
        <div className="mx-auto mt-4 max-w-6xl">
          <RegistreTrustLink />
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
      <section className="px-4 pt-8">
        <div className="relative mx-auto max-w-6xl">
          <HeroProducts className="ring-1 ring-gold/40" />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-linear-to-t from-wine via-wine/45 to-wine/10" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-10">
            <p className="text-[10px] uppercase tracking-[0.32em] text-champagne">Maison de beauté · Yaoundé</p>
            <h1 className="mt-3 max-w-xl font-serif text-4xl leading-[0.95] text-cream sm:text-5xl md:text-7xl">{SHOP_HERO_LINE}</h1>
            <p className="mt-4 max-w-lg text-sm text-cream/80">{SHOP_TRUST_LINE}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <Link href={MECHES_HREF} className="rounded-full bg-brown px-6 py-3 text-center text-cream">
                Voir les mèches
              </Link>
              <Link href="/boutique" className="rounded-full border border-cream/70 bg-cream px-6 py-3 text-center text-wine">
                Entrer dans la boutique
              </Link>
            </div>
          </div>
        </div>
        <ul className="mx-auto mt-6 grid max-w-6xl overflow-hidden rounded-[1.4rem] border border-gold/30 bg-gold/25 sm:grid-cols-2 lg:grid-cols-4">
          <li className="bg-cream px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold">En magasin</p>
            <p className="mt-1 text-sm text-wine">{NERA_IDENTITY.streetAddress}</p>
          </li>
          <li className="bg-cream px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Ouvert</p>
            <p className="mt-1 text-sm text-wine">{NERA_IDENTITY.hoursWeekdays}</p>
          </li>
          <li className="bg-cream px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Paiement</p>
            <p className="mt-1 text-sm text-wine">Orange Money sans frais · MoMo</p>
          </li>
          <li className="bg-cream px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Entreprise</p>
            <div className="mt-1">
              <RegistreTrustLink />
            </div>
          </li>
        </ul>
      </section>

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
                className="group relative aspect-[3/4] w-[68%] shrink-0 snap-start overflow-hidden rounded-[1.6rem] bg-blush md:aspect-[5/4] md:w-auto"
              >
                <ProductPhoto
                  src={cover?.src}
                  alt={cover?.alt || category.name}
                  sizes="(max-width: 768px) 70vw, 33vw"
                  quality={SHOP_IMAGE_QUALITY}
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-wine/80 to-transparent p-4 font-serif text-2xl text-white sm:text-3xl">
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
