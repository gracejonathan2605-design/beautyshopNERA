import type { Metadata } from "next";
import Link from "next/link";
import { getCachedPartnerBrands } from "@/lib/catalog-cache";
import { PartnerBrandMark } from "@/components/shop/partner-brands-section";
import { JsonLd } from "@/components/seo/json-ld";
import { collectionJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";
import { partnerBrandPath } from "@/lib/partner-brands";
import { NERA_IDENTITY } from "@/lib/nera-identity";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: "Nos marques partenaires",
  description: `Marques disponibles chez ${NERA_IDENTITY.name}, boutique de beauté à Yaoundé. Achetez en magasin ou en ligne.`,
  path: "/marques",
});

export default async function PartnerBrandsPage() {
  let brands: Awaited<ReturnType<typeof getCachedPartnerBrands>> = [];
  try {
    brands = await getCachedPartnerBrands();
  } catch {
    brands = [];
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd
        data={webPageJsonLd({
          path: "/marques",
          name: "Nos marques partenaires",
          description: `Marques disponibles chez ${NERA_IDENTITY.name}.`,
        })}
      />
      <JsonLd
        data={collectionJsonLd({
          path: "/marques",
          name: "Nos marques partenaires",
          description: `Marques disponibles chez ${NERA_IDENTITY.name}.`,
          items: brands.map((brand) => ({ name: brand.name, path: partnerBrandPath(brand.slug) })),
        })}
      />
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Chez NERA</p>
      <h1 className="mt-3 font-serif text-5xl text-wine">Nos marques partenaires</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-black/60">
        Chaque marque reste elle-même. Vous achetez comme d’habitude chez {NERA_IDENTITY.name} — panier, paiement,
        retrait ou livraison.
      </p>
      {brands.length === 0 ? (
        <p className="mt-10 rounded-[1.6rem] border border-[#eee0e6] bg-white/85 p-8 text-black/55">
          Les marques partenaires apparaîtront ici dès qu’elles seront publiées depuis l’administration.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={partnerBrandPath(brand.slug)}
                className="block rounded-[1.6rem] border border-[#eee0e6] bg-white/85 p-6 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg"
              >
                <PartnerBrandMark name={brand.name} logo={brand.logo} />
                <h2 className="mt-4 font-serif text-3xl text-wine">{brand.name}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gold">× {NERA_IDENTITY.name}</p>
                {brand.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-black/55">{brand.description}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
