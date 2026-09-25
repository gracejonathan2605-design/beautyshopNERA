import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { NERA_IDENTITY } from "@/lib/nera-identity";

export const metadata: Metadata = pageMetadata({
  title: "Confidentialité",
  description: "Données collectées par NERA Beauté & Shop pour les commandes et le compte client.",
  path: "/confidentialite",
});

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-5xl text-wine">Confidentialité</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-black/70">
        <p>
          {NERA_IDENTITY.name} enregistre le nom, le téléphone et, en livraison, l’adresse, uniquement pour préparer et livrer la commande.
        </p>
        <p>Le compte client garde l’historique des commandes. Les preuves de paiement sont visibles par l’équipe qui encaisse.</p>
        <p>Les messages WhatsApp partent vers le numéro indiqué, pour confirmer la commande, son statut, ou un retour en stock demandé.</p>
        <p>Pour une question sur vos données : {NERA_IDENTITY.email}.</p>
      </div>
    </article>
  );
}
