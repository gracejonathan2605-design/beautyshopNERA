import Link from "next/link";
import type { BrowseQuery } from "@/lib/shop-browse";
import { browseHref } from "@/lib/shop-browse";

export function CatalogToolbar({
  query,
  rayons,
  basePath,
  hideRayon = false,
}: {
  query: BrowseQuery;
  rayons: { slug: string; name: string }[];
  basePath: string;
  hideRayon?: boolean;
}) {
  return (
    <form action={basePath} className="mt-6 space-y-3">
      <input
        name="q"
        defaultValue={query.q}
        placeholder="Rechercher un produit, une mèche, un parfum…"
        className="w-full rounded-full border border-[#eee0e6] bg-white px-5 py-3"
      />
      <div className="flex flex-wrap gap-2">
        {!hideRayon ? (
          <select
            name="rayon"
            defaultValue={query.rayon}
            className="rounded-full border border-[#eee0e6] bg-white px-3 py-2 text-sm"
            aria-label="Rayon"
          >
            <option value="">Tous les rayons</option>
            {rayons.map((rayon) => (
              <option key={rayon.slug} value={rayon.slug}>
                {rayon.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          name="vue"
          defaultValue={query.vue === "new" ? "nouveautes" : query.vue === "promo" ? "promos" : ""}
          className="rounded-full border border-[#eee0e6] bg-white px-3 py-2 text-sm"
          aria-label="Sélection"
        >
          <option value="">Tous les articles</option>
          <option value="nouveautes">Nouveautés</option>
          <option value="promos">Promos</option>
        </select>
        <select
          name="tri"
          defaultValue={
            query.tri === "price-asc" ? "prix-asc" : query.tri === "price-desc" ? "prix-desc" : query.tri === "newest" ? "recent" : ""
          }
          className="rounded-full border border-[#eee0e6] bg-white px-3 py-2 text-sm"
          aria-label="Trier"
        >
          <option value="">Nom A → Z</option>
          <option value="prix-asc">Prix croissant</option>
          <option value="prix-desc">Prix décroissant</option>
          <option value="recent">Plus récents</option>
        </select>
        <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Filtrer</button>
      </div>
    </form>
  );
}

export function CatalogPagination({
  query,
  page,
  pages,
  total,
  basePath,
}: {
  query: BrowseQuery;
  page: number;
  pages: number;
  total: number;
  basePath: string;
}) {
  if (!total) return null;
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-black/55">
      <p>
        {total} article{total > 1 ? "s" : ""} · page {page}/{pages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={browseHref(basePath, query, { page: page - 1 })}
            className="rounded-full border border-[#eee0e6] px-4 py-2 text-wine"
          >
            Précédent
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            href={browseHref(basePath, query, { page: page + 1 })}
            className="rounded-full bg-brown px-4 py-2 text-cream"
          >
            Suivant
          </Link>
        ) : null}
      </div>
    </div>
  );
}
