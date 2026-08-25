import type { Metadata } from "next";
import { getActiveFlashProducts } from "@/lib/catalog-cache";
import { FlashProductCard } from "@/components/shop/flash-product-card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FLASH_TITLE = "FLASH NERA | Nouveautés Beauté & Mode";
const FLASH_DESCRIPTION = "Découvrez les dernières nouveautés de NERA Beauté & Shop.";

export const metadata: Metadata = {
  title: FLASH_TITLE,
  description: FLASH_DESCRIPTION,
  openGraph: {
    title: FLASH_TITLE,
    description: FLASH_DESCRIPTION,
    url: "/flash",
    siteName: "NERA Beauté & Shop",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: FLASH_TITLE,
    description: FLASH_DESCRIPTION,
  },
  alternates: { canonical: "/flash" },
  robots: { index: true, follow: true },
};

export default async function FlashPage() {
  const products = await getActiveFlashProducts(48);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.32em] text-gold">Nouveautés du moment</p>
      <h1 className="mt-3 font-serif text-5xl text-wine md:text-6xl">🔥 FLASH NERA</h1>
      <p className="mt-4 max-w-2xl text-lg text-black/55">Les nouveautés du moment — une sélection qui ne reste pas longtemps en avant.</p>
      {products.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {products.map((product) => (
            <FlashProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-[1.7rem] border border-[#eee0e6] bg-white p-8 text-black/55">
          Aucune nouveauté en avant pour l’instant. Parcourez la boutique, les pièces restent disponibles dans leurs rayons.
        </p>
      )}
    </div>
  );
}
