import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { getHomeCatalog, getActiveFlashProducts } from "@/lib/catalog-cache";
import { BrandLogo, HeroProducts } from "@/components/brand/logo";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { FlashSection } from "@/components/shop/flash-section";
import { HomeIdentity } from "@/components/shop/home-identity";
import { ShopFaq } from "@/components/shop/shop-faq";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { NERA_IDENTITY, NERA_PITCH } from "@/lib/nera-identity";
import { PRODUCT_GRID_HOME_CLASS } from "@/lib/image-limits";

export const runtime = "nodejs";

export const metadata: Metadata = pageMetadata({
  title: "NERA Beauté & Shop | Boutique beauté à Yaoundé",
  description:
    "NERA Beauté & Shop, boutique de beauté à Yaoundé au Marché Neptune Ahala, face Skymotors. Cosmétiques, soins, cheveux, mèches, perruques, maquillage et parfums — magasin et e-commerce. Livraison disponible.",
  path: "/",
  absoluteTitle: true,
});

const TRUST = [
  { title: "Paiement OM & MoMo", text: "Orange Money et MTN Mobile Money, en boutique comme en ligne." },
  { title: "Livraison 24h", text: "Livraison rapide sous 24h à Yaoundé, ou retrait en magasin." },
  { title: "Sélection premium", text: "Soins, mèches, parfums et mode choisis pour durer." },
  { title: "Conseil NERA", text: "Une équipe pour vous accompagner, pas un catalogue froid." },
];

export default async function HomePage() {
  let catalog: Awaited<ReturnType<typeof getHomeCatalog>> | null = null;
  let flash: Awaited<ReturnType<typeof getActiveFlashProducts>> = [];
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
  if (!catalog) {
    return (
      <section className="hero-light px-4 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div>
            <BrandLogo size="hero" priority className="mb-6" />
            <p className="text-sm uppercase tracking-[0.32em] text-gold">Yaoundé · Cameroun</p>
            <h1 className="mt-4 font-serif text-6xl text-wine">NERA Beauté & Shop</h1>
            <p className="mt-4 max-w-xl text-lg text-black/65">
              La boutique n’a pas pu charger le catalogue. Réessayez dans un instant, ou contactez-nous au{" "}
              {NERA_IDENTITY.phoneDisplay}.
            </p>
          </div>
          <HeroProducts />
        </div>
      </section>
    );
  }
  const { featured: featuredRaw, news, promos: promosRaw, categories } = catalog;
  const flashIds = new Set(flash.map((p) => p.id));
  const featured = featuredRaw.filter((p) => !flashIds.has(p.id));
  const taken = new Set([...flashIds, ...featured.map((p) => p.id)]);
  const newsWithoutFlash = news.filter((p) => !taken.has(p.id));
  for (const item of newsWithoutFlash) taken.add(item.id);
  const promos = promosRaw.filter((p) => !taken.has(p.id));

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
      <section className="hero-light px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div>
            <BrandLogo size="lg" priority className="mb-6" />
            <p className="text-sm uppercase tracking-[0.35em] text-gold">Maison de beauté · Yaoundé</p>
            <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-wine md:text-6xl">
              {NERA_IDENTITY.name}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/60">{NERA_IDENTITY.slogan}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-black/65">{NERA_PITCH}</p>
            <p className="mt-3 text-sm text-black/55">
              {NERA_IDENTITY.addressLine} ·{" "}
              <a className="text-brown underline" href={`tel:${NERA_IDENTITY.phoneE164}`}>
                {NERA_IDENTITY.phoneDisplay}
              </a>
            </p>
            <div className="mt-6">
              <PayDeliveryBadges />
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/boutique" className="rounded-full bg-brown px-8 py-3 text-cream">
                Entrer dans la boutique
              </Link>
              <Link href="/a-propos" className="rounded-full border border-[#eee0e6] bg-white/85 px-8 py-3 text-wine">
                À propos
              </Link>
            </div>
          </div>
          <HeroProducts />
        </div>
      </section>

      <FlashSection products={flash} />

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((item) => (
          <div key={item.title} className="rounded-3xl border border-[#eee0e6] bg-white/80 p-5">
            <p className="font-serif text-xl text-wine">{item.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-black/55">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Rayons</p>
            <h2 className="mt-2 font-serif text-4xl text-wine">Univers NERA</h2>
          </div>
          <Link href="/boutique" className="text-sm text-brown underline">
            Tout voir
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categorie/${c.slug}`}
              className="group rounded-[1.6rem] border border-[#eee0e6] bg-white/85 p-6 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg"
            >
              <p className="font-serif text-2xl text-wine group-hover:text-brown">{c.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-black/35">Découvrir</p>
            </Link>
          ))}
        </div>
      </section>

      {[
        ["Sélection NERA", featured],
        ["Nouveautés", newsWithoutFlash],
        ["Promotions", promos],
      ].map(([title, items]) =>
        (items as typeof featured).length ? (
          <section key={title as string} className="mx-auto max-w-6xl px-4 py-8">
            <h2 className="font-serif text-4xl text-wine">{title as string}</h2>
            <div className={`${PRODUCT_GRID_HOME_CLASS} mt-6`}>
              {(items as typeof featured).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <HomeIdentity categories={categories} />
      <section className="mx-auto max-w-3xl px-4 pb-8">
        <h2 className="font-serif text-3xl text-wine">NERA, en bref</h2>
        <dl className="mt-6 space-y-4 text-black/65">
          <div>
            <dt className="font-medium text-wine">Où ?</dt>
            <dd className="mt-1">{NERA_IDENTITY.addressLine}</dd>
          </div>
          <div>
            <dt className="font-medium text-wine">Contact</dt>
            <dd className="mt-1">
              <a className="text-brown underline" href={`tel:${NERA_IDENTITY.phoneE164}`}>
                {NERA_IDENTITY.phoneDisplay}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-wine">Horaires</dt>
            <dd className="mt-1">
              {NERA_IDENTITY.hoursWeekdays}
              <br />
              {NERA_IDENTITY.hoursSunday}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-wine">Livraison</dt>
            <dd className="mt-1">Oui, livraison disponible à Yaoundé, avec retrait en magasin.</dd>
          </div>
        </dl>
      </section>
      <ShopFaq />
    </div>
  );
}
