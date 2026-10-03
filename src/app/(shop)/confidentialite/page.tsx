import type { Metadata } from "next";
import { LegalDocument } from "@/components/shop/legal-document";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { pageMetadata } from "@/lib/seo";
import { LEGAL_UPDATED, privacySections } from "@/lib/shop-legal";

export const metadata: Metadata = pageMetadata({
  title: "Confidentialité",
  description: `Notice de ${NERA_IDENTITY.legalName} sur les données de commande, de compte et de paiement, selon la loi camerounaise n° 2024/017.`,
  path: "/confidentialite",
});

export default function PrivacyPage() {
  return (
    <LegalDocument
      kicker="Données personnelles"
      title="Confidentialité"
      description={`${NERA_IDENTITY.legalName} explique quelles données la boutique utilise pour une commande, un compte ou un message, pourquoi, pendant combien de temps, et quels droits la loi camerounaise reconnaît.`}
      updated={LEGAL_UPDATED}
      sections={privacySections()}
      current="/confidentialite"
    />
  );
}
