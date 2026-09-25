import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getShopSettings } from "@/lib/settings";
import { NERA_IDENTITY } from "@/lib/nera-identity";

export const metadata: Metadata = pageMetadata({
  title: "Conditions de vente",
  description: `Conditions de vente de ${NERA_IDENTITY.name}.`,
  path: "/cgv",
});

export default async function TermsPage() {
  const settings = await getShopSettings().catch(() => null);
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-5xl text-wine">Conditions de vente</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-black/70">
        <p>
          {NERA_IDENTITY.name} vend des produits de beauté en boutique au {NERA_IDENTITY.streetAddress}, {NERA_IDENTITY.addressLocality}, et sur ce site.
        </p>
        <p>Le prix affiché est en FCFA, livraison en plus lorsque vous choisissez une zone. Le paiement Orange Money ou MTN Mobile Money est confirmé par l’équipe après réception de la référence.</p>
        <p>{settings?.terms || "Les articles d'hygiène et les mèches ouvertes ne sont ni repris ni échangés."}</p>
        <p>Une commande impayée peut être annulée et le stock libéré. Le délai figure dans les paramètres de la boutique.</p>
        <p>Contact : {settings?.email} · {NERA_IDENTITY.phoneDisplay}</p>
      </div>
    </article>
  );
}
