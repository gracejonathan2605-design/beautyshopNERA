import { ProductCard } from "@/components/shop/product-card";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { CatalogPagination, CatalogToolbar } from "@/components/shop/catalog-toolbar";
import { browseShopProducts, parseBrowseQuery, shopRayons } from "@/lib/shop-browse";

export default async function BoutiquePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rayon?: string; vue?: string; tri?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const query = parseBrowseQuery(raw);
  const [rayons, result] = await Promise.all([shopRayons(), browseShopProducts(query)]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Maison NERA</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Boutique</h1>
      <p className="mt-3 max-w-xl text-black/55">
        Soins, mèches, parfums et mode — filtrez par rayon, nouveauté ou promo. Les ruptures restent visibles.
      </p>
      <div className="mt-5">
        <PayDeliveryBadges />
      </div>
      <CatalogToolbar query={query} rayons={rayons} basePath="/boutique" />
      {query.q || query.rayon || query.vue !== "all" ? (
        <p className="mt-4 text-sm text-black/50">
          {result.total} résultat{result.total > 1 ? "s" : ""}
          {query.q ? ` pour « ${query.q} »` : ""}
        </p>
      ) : null}
      {result.items.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-[1.7rem] border border-dashed border-[#eee0e6] bg-white/70 p-10 text-center text-black/50">
          Aucun produit pour le moment{query.q ? " avec cette recherche" : ""}.
        </p>
      )}
      <CatalogPagination
        query={query}
        page={result.page}
        pages={result.pages}
        total={result.total}
        basePath="/boutique"
      />
    </div>
  );
}
