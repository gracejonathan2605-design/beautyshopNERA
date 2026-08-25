"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProduct, type ProductFormState } from "@/app/actions/admin";
import { VideoInput } from "@/components/admin/video-input";
import { CategorySelect } from "@/components/admin/category-select";
import { FormBusyOverlay, PendingSubmitButton } from "@/components/admin/form-pending";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-media";
import type { CategoryOptionGroup } from "@/lib/catalog";

const INITIAL: ProductFormState = { ok: false };

export function ProductEditForm({
  productId,
  name,
  categoryId,
  salePrice,
  costPrice,
  promoPrice,
  shortDescription,
  isFeatured,
  isPromo,
  isNew,
  photoCount,
  hasVideo,
  categoryGroups,
}: {
  productId: string;
  name: string;
  categoryId: string;
  salePrice: number;
  costPrice: number;
  promoPrice: number | null;
  shortDescription: string;
  isFeatured: boolean;
  isPromo: boolean;
  isNew: boolean;
  photoCount: number;
  hasVideo: boolean;
  categoryGroups: CategoryOptionGroup[];
}) {
  const [state, action, pending] = useActionState(updateProduct, INITIAL);
  const [clientError, setClientError] = useState("");
  const [saving, setSaving] = useState(false);
  const remainingPhotos = MAX_PRODUCT_PHOTOS - photoCount;
  const busy = pending || saving;
  const message = clientError || state.error;

  useEffect(() => {
    if (!pending) setSaving(false);
  }, [pending]);

  return (
    <form
      action={action}
      noValidate
      className="relative mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-2"
      onSubmit={(event) => {
        setClientError("");
        const form = event.currentTarget;
        const nextName = String(new FormData(form).get("name") ?? "").trim();
        const nextCategory = String(new FormData(form).get("categoryId") ?? "").trim();
        const nextPrice = String(new FormData(form).get("salePrice") ?? "").trim();
        const photos = (form.elements.namedItem("photos") as HTMLInputElement | null)?.files;
        if (!nextName) {
          event.preventDefault();
          setClientError("Indiquez le nom du produit.");
          return;
        }
        if (!nextCategory) {
          event.preventDefault();
          setClientError("Choisissez une catégorie.");
          return;
        }
        if (!nextPrice) {
          event.preventDefault();
          setClientError("Indiquez un prix de vente en FCFA.");
          return;
        }
        if (photos && photos.length > remainingPhotos) {
          event.preventDefault();
          setClientError(`Maximum ${MAX_PRODUCT_PHOTOS} photos. Il reste ${remainingPhotos} emplacement(s).`);
          return;
        }
        setSaving(true);
      }}
    >
      <FormBusyOverlay
        active={busy}
        title="Enregistrement en cours"
        detail="Mise à jour du produit, compression des nouvelles photos si besoin. Visible ensuite en boutique et à la caisse."
      />
      {message ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 md:col-span-2">{message}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2">
          {state.warning ?? "Produit mis à jour. Visible en boutique et à la caisse."}
        </p>
      ) : null}
      <input type="hidden" name="productId" value={productId} />
      <input name="name" required defaultValue={name} className="rounded-xl border px-3 py-2" />
      <CategorySelect groups={categoryGroups} defaultValue={categoryId} />
      <input name="salePrice" required defaultValue={salePrice} className="rounded-xl border px-3 py-2" />
      <input
        name="promoPrice"
        defaultValue={promoPrice ?? ""}
        placeholder="Prix promo (FCFA)"
        className="rounded-xl border px-3 py-2"
      />
      <input name="costPrice" defaultValue={costPrice} className="rounded-xl border px-3 py-2" />
      <input
        name="shortDescription"
        defaultValue={shortDescription}
        className="rounded-xl border px-3 py-2 md:col-span-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFeatured" defaultChecked={isFeatured} /> Vedette
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPromo" defaultChecked={isPromo} /> Promo
      </label>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="isNew" defaultChecked={isNew} /> Nouveauté
      </label>
      {remainingPhotos > 0 ? (
        <label className="text-sm md:col-span-2">
          Ajouter des photos ({photoCount}/{MAX_PRODUCT_PHOTOS})
          <input name="photos" type="file" accept="image/*" multiple className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
      ) : null}
      {!hasVideo ? <VideoInput label="Ajouter une vidéo (40 s max)" /> : null}
      <PendingSubmitButton
        idle="Enregistrer"
        pendingLabel="Enregistrement…"
        className="rounded-full bg-brown py-3 text-cream disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
      />
    </form>
  );
}
