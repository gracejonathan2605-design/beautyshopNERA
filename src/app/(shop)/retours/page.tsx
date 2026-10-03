import type { Metadata } from "next";
import { LegalDocument } from "@/components/shop/legal-document";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { pageMetadata } from "@/lib/seo";
import { LEGAL_UPDATED, returnSections } from "@/lib/shop-legal";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = pageMetadata({
  title: "Conditions de retour",
  description: `Retours chez ${NERA_IDENTITY.name} : vente ferme pour l’hygiène et les mèches ouvertes. Article scellé : 48 heures, échange ou avoir.`,
  path: "/retours",
});

export default async function ReturnsPage() {
  const settings = await getShopSettings().catch(() => null);
  return (
    <LegalDocument
      kicker="Après l’achat"
      title="Conditions de retour"
      description="La vente est ferme dès qu’un produit d’hygiène, de cosmétique, de parfum ou de cheveu a été ouvert. Un article encore scellé peut être présenté sous 48 heures."
      updated={LEGAL_UPDATED}
      sections={returnSections(settings?.terms)}
      current="/retours"
    />
  );
}
