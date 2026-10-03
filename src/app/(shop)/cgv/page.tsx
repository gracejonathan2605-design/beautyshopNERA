import type { Metadata } from "next";
import { LegalDocument } from "@/components/shop/legal-document";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { pageMetadata } from "@/lib/seo";
import { DEFAULT_PENDING_ORDER_HOURS } from "@/lib/pending-orders";
import { cgvSections, LEGAL_UPDATED } from "@/lib/shop-legal";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = pageMetadata({
  title: "Conditions de vente",
  description: `Conditions de vente de ${NERA_IDENTITY.legalName}, enseigne ${NERA_IDENTITY.name} à Yaoundé : commande, paiement Orange Money et MTN, livraison et responsabilité.`,
  path: "/cgv",
});

export default async function TermsPage() {
  const settings = await getShopSettings().catch(() => null);
  const hours = settings?.pendingOrderHours ?? DEFAULT_PENDING_ORDER_HOURS;
  return (
    <LegalDocument
      kicker="Vente"
      title="Conditions de vente"
      description={`${NERA_IDENTITY.name} vend en magasin et sur ce site. Ces conditions fixent le moment où la vente est conclue, le paiement, la livraison et les limites de responsabilité.`}
      updated={LEGAL_UPDATED}
      sections={cgvSections(hours)}
      current="/cgv"
    />
  );
}
