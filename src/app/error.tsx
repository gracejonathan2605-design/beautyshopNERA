"use client";

import { MaisonPageHead } from "@/components/shop/maison-hero";
import { SHOP_PAGE_UNAVAILABLE } from "@/lib/shop-public-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <MaisonPageHead
        align="center"
        kicker="NERA Beauté & Shop"
        title="La page n’a pas pu s’afficher"
        lede={SHOP_PAGE_UNAVAILABLE}
      />
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="text-xs text-black/40">{error.digest ? `Réf. ${error.digest}` : "Réessayez dans un instant."}</p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-brown px-6 py-3 text-cream">
          Réessayer
        </button>
      </div>
    </>
  );
}
