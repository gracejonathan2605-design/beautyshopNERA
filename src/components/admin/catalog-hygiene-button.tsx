"use client";

import { cleanupLiveCatalog } from "@/app/actions/admin";

export function CatalogHygieneButton() {
  return (
    <form
      action={cleanupLiveCatalog}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Nettoyer le catalogue live ? Les doublons et les fiches sans photo sortiront de la boutique. Les noms seront corrigés. 20 fiches phares seront complétées.",
          )
        ) {
          event.preventDefault();
        }
      }}
      className="mt-4"
    >
      <button className="rounded-full border border-wine px-4 py-2 text-sm text-wine">
        Nettoyer le catalogue live
      </button>
      <p className="mt-1 max-w-xl text-xs text-black/45">
        Dépublie les doublons (savons, lingeries, minaudières…) et les fiches sans photo, fusionne leurs variantes
        sur une seule fiche, corrige les noms, rattache une marque seulement si elle est dans le nom, reprend un
        GTIN seulement s’il est déjà dans le SKU, et complète 20 fiches phares.
      </p>
    </form>
  );
}
