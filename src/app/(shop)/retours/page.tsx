import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = pageMetadata({
  title: "Retours",
  description: "Conditions de retour et d’échange chez NERA Beauté & Shop.",
  path: "/retours",
});

export default async function ReturnsPage() {
  const settings = await getShopSettings().catch(() => null);
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-5xl text-wine">Retours</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-black/70">
        <p>{settings?.terms || "Les articles d'hygiène et les mèches ouvertes ne sont ni repris ni échangés."}</p>
        <p>Pour un article non ouvert, contactez la boutique avec votre numéro de commande dans les 48 heures. Le remboursement suit le même réseau que le paiement, après vérification en magasin.</p>
      </div>
    </article>
  );
}
