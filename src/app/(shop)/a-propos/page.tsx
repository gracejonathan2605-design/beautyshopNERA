import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { ShopFaq } from "@/components/shop/shop-faq";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { JsonLd } from "@/components/seo/json-ld";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { faqJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";
import { getNavCategories } from "@/lib/catalog-cache";

export const metadata: Metadata = pageMetadata({
  title: "À propos",
  description:
    "NERA Beauté & Shop est une boutique de beauté à Yaoundé, au Marché Neptune Ahala, face Skymotors. Magasin et e-commerce, livraison disponible.",
  path: "/a-propos",
});

export default async function AboutPage() {
  const categories = await getNavCategories().catch(() => []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={webPageJsonLd({
          path: "/a-propos",
          name: "À propos de NERA Beauté & Shop",
          description: "Présentation de la boutique de beauté NERA à Yaoundé.",
        })}
      />
      <JsonLd data={faqJsonLd()} />
      <p className="text-xs uppercase tracking-[0.28em] text-gold">La maison</p>
      <h1 className="mt-3 font-serif text-5xl text-wine">À propos de NERA Beauté & Shop</h1>
      <div className="mt-6">
        <BrandLogo size="lg" />
      </div>
      <p className="mt-8 text-lg leading-relaxed text-black/65">{NERA_IDENTITY.slogan}</p>
      <p className="mt-6 leading-relaxed text-black/65">
        NERA Beauté & Shop est une boutique de beauté à Yaoundé. Nous accueillons en magasin et proposons
        aussi une boutique en ligne pour commander les produits de la sélection NERA.
      </p>
      <h2 className="mt-10 font-serif text-3xl text-wine">Où nous trouver</h2>
      <address className="mt-3 not-italic leading-relaxed text-black/65">
        <p>{NERA_IDENTITY.addressLine}</p>
        <p className="mt-2">
          Téléphone :{" "}
          <a className="text-brown underline" href={`tel:${NERA_IDENTITY.phoneE164}`}>
            {NERA_IDENTITY.phoneDisplay}
          </a>
        </p>
      </address>
      <div className="mt-5">
        <PayDeliveryBadges />
      </div>
      <h2 className="mt-10 font-serif text-3xl text-wine">Ce que nous vendons</h2>
      <p className="mt-3 leading-relaxed text-black/65">
        Selon le catalogue du moment : cosmétiques, soins du visage et du corps, produits capillaires, mèches,
        perruques, extensions, maquillage, parfums, accessoires beauté et bien-être.
      </p>
      {categories.length ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categorie/${category.slug}`}
                className="inline-block rounded-full border border-[#eee0e6] bg-white px-3 py-1.5 text-sm text-wine hover:border-gold"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <h2 className="mt-10 font-serif text-3xl text-wine">Pour qui</h2>
      <p className="mt-3 leading-relaxed text-black/65">
        Pour les clientes qui cherchent des produits de beauté et de soins à Yaoundé, avec un conseil en
        boutique et la possibilité de commander en ligne.
      </p>
      <h2 className="mt-10 font-serif text-3xl text-wine">Services</h2>
      <p className="mt-3 leading-relaxed text-black/65">
        Achat en magasin, commande en ligne, retrait, et livraison disponible. Paiement Orange Money, MTN MoMo
        et espèces selon les options proposées.
      </p>
      <p className="mt-8">
        <Link href="/boutique" className="rounded-full bg-brown px-8 py-3 text-cream inline-block">
          Voir la boutique
        </Link>
      </p>
      <ShopFaq />
    </div>
  );
}
