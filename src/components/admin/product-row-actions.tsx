"use client";

import { useTransition } from "react";
import { deleteProduct, updateProductPrice } from "@/app/actions/admin";
import { toggleProductPublish } from "@/app/actions/ops";

export function ProductRowActions({
  productId,
  name,
  variantId,
  salePrice,
  published,
  canUpdate = false,
  canDelete = false,
}: {
  productId: string;
  name: string;
  variantId: string | null;
  salePrice: number;
  published: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const [pending, start] = useTransition();
  if (!canUpdate && !canDelete) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canUpdate && variantId ? (
        <form
          className="flex items-center gap-1"
          action={(formData) => start(() => updateProductPrice(formData))}
        >
          <input type="hidden" name="variantId" value={variantId} />
          <input
            name="salePrice"
            inputMode="numeric"
            defaultValue={salePrice}
            className="w-28 rounded-lg border px-2 py-1"
            aria-label="Prix"
          />
          <button disabled={pending} className="rounded-full bg-brown px-3 py-1 text-xs text-cream disabled:opacity-60">
            Prix
          </button>
        </form>
      ) : null}
      {canUpdate ? (
        <a href={`/admin/produits/${productId}`} className="rounded-full border px-3 py-1 text-xs">
          Modifier
        </a>
      ) : null}
      {canUpdate ? (
        <form action={(formData) => start(() => toggleProductPublish(formData))}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="publish" value={published ? "0" : "1"} />
          <button disabled={pending} className="rounded-full border px-3 py-1 text-xs disabled:opacity-60">
            {published ? "Dépublier" : "Publier"}
          </button>
        </form>
      ) : null}
      {canDelete ? (
        <form
          action={(formData) => {
            if (!confirm(`Supprimer « ${name} » de la boutique et de la caisse ?`)) return;
            start(() => deleteProduct(formData));
          }}
        >
          <input type="hidden" name="productId" value={productId} />
          <button disabled={pending} className="rounded-full px-3 py-1 text-xs text-red-700">
            Supprimer
          </button>
        </form>
      ) : null}
    </div>
  );
}
