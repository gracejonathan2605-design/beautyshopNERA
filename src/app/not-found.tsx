import Link from "next/link";
import { MaisonPageHead } from "@/components/shop/maison-hero";

export default function NotFound() {
  return (
    <>
      <MaisonPageHead
        align="center"
        kicker="NERA Beauté & Shop"
        title="Page introuvable"
        lede="Cette page n’existe pas ou n’est plus en ligne. Revenez à l’accueil ou parcourez la boutique."
      />
      <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-3 px-4 py-12">
        <Link href="/" className="rounded-full bg-brown px-6 py-3 text-cream">
          Accueil
        </Link>
        <Link href="/boutique" className="rounded-full border border-gold/40 bg-cream px-6 py-3 text-wine">
          Boutique
        </Link>
      </div>
    </>
  );
}
