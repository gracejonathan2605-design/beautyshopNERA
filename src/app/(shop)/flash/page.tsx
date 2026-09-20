import type { Metadata } from "next";
import { getActiveFlashProducts } from "@/lib/catalog-cache";
import { FlashProductCard } from "@/components/shop/flash-product-card";
import { ShopBreadcrumbs } from "@/components/shop/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, collectionJsonLd, pageMetadata } from "@/lib/seo";
import { PRODUCT_GRID_HOME_CLASS } from "@/lib/image-limits";

export const runtime = "nodejs";

const FLASH_DESCRIPTION =
  "Les nouveautés mises en avant chez NERA Beauté & Shop à Yaoundé — une sélection courte, à découvrir maintenant.";

export async function generateMetadata(): Promise<Metadata> {
  const products = await getActiveFlashProducts(48).catch(() => []);
  return pageMetadata({
    title: "FLASH NERA",
    description: FLASH_DESCRIPTION,
    path: "/flash",
    index: products.length > 0,
    follow: true,
  });
}

export default async function FlashPage() {
  const products = await getActiveFlashProducts(48).catch(() => []);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "FLASH NERA", path: "/flash" },
        ])}
      />
      {products.length ? (
        <JsonLd
          data={collectionJsonLd({
            path: "/flash",
            name: "FLASH NERA",
            description: FLASH_DESCRIPTION,
            items: products.map((product) => ({ name: product.name, path: `/produit/${product.slug}` })),
          })}
        />
      ) : null}
      <ShopBreadcrumbs items={[{ name: "Accueil", href: "/" }, { name: "FLASH NERA" }]} />
      <p className="mt-3 text-xs uppercase tracking-[0.32em] text-gold">Nouveautés du moment</p>
      <h1 className="mt-3 font-serif text-5xl text-wine md:text-6xl">FLASH NERA</h1>
      <p className="mt-4 max-w-2xl text-lg text-black/55">
        Les nouveautés du moment chez NERA Beauté & Shop à Yaoundé — une sélection qui ne reste pas longtemps en avant.
      </p>
      {products.length ? (
        <>
          <h2 className="mt-10 font-serif text-3xl text-wine">Nouveautés</h2>
          <div className={`mt-6 ${PRODUCT_GRID_HOME_CLASS}`}>
            {products.map((product) => (
              <FlashProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-10 rounded-[1.7rem] border border-[#eee0e6] bg-white p-8 text-black/55">
          Aucune nouveauté en avant pour l’instant. Parcourez la boutique, les pièces restent disponibles dans leurs rayons.
        </p>
      )}
    </div>
  );
}
