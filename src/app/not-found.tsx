import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="flex justify-center">
        <BrandLogo size="lg" />
      </div>
      <p className="mt-6 text-sm uppercase tracking-[0.3em] text-gold">NERA Beauté & Shop</p>
      <h1 className="mt-4 font-serif text-4xl text-wine">Page introuvable</h1>
      <p className="mt-4 text-black/65">
        Cette page n’existe pas ou n’est plus en ligne. Revenez à l’accueil ou parcourez la boutique.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-brown px-6 py-3 text-cream">
          Accueil
        </Link>
        <Link href="/boutique" className="rounded-full border border-[#eee0e6] bg-white px-6 py-3 text-wine">
          Boutique
        </Link>
      </div>
    </div>
  );
}