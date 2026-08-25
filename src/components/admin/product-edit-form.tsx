"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateProduct, type ProductFormState } from "@/app/actions/admin";
import { VideoInput } from "@/components/admin/video-input";
import { CategorySelect } from "@/components/admin/category-select";
import { FormBusyOverlay, PendingSubmitButton } from "@/components/admin/form-pending";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-media";
import { prepareProductFormData, wrapProductAction } from "@/lib/product-form-submit";
import type { CategoryOptionGroup } from "@/lib/catalog";

const INITIAL: ProductFormState = { ok: false };
const updateProductSafe = wrapProductAction(updateProduct);

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
  onlineVisible,
  barcode,
  brandId,
  supplierId,
  photoCount,
  hasVideo,
  categoryGroups,
  brands = [],
  suppliers = [],
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
  onlineVisible: boolean;
  barcode: string;
  brandId: string;
  supplierId: string;
  photoCount: number;
  hasVideo: boolean;
  categoryGroups: CategoryOptionGroup[];
  brands?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateProductSafe, INITIAL);
  const [, startTransition] = useTransition();
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
      onSubmit={async (event) => {
        event.preventDefault();
        setClientError("");
        const form = event.currentTarget;
        const nextName = String(new FormData(form).get("name") ?? "").trim();
        const nextCategory = String(new FormData(form).get("categoryId") ?? "").trim();
        const nextPrice = String(new FormData(form).get("salePrice") ?? "").trim();
        const photos = (form.elements.namedItem("photos") as HTMLInputElement | null)?.files;
        if (!nextName) {
          setClientError("Indiquez le nom du produit.");
          return;
        }
        if (!nextCategory) {
          setClientError("Choisissez une catégorie.");
          return;
        }
        if (!nextPrice) {
          setClientError("Indiquez un prix de vente en FCFA.");
          return;
        }
        if (photos && photos.length > remainingPhotos) {
          setClientError(`Maximum ${MAX_PRODUCT_PHOTOS} photos. Il reste ${remainingPhotos} emplacement(s).`);
          return;
        }
        setSaving(true);
        try {
          const fd = await prepareProductFormData(form);
          startTransition(() => {
            action(fd);
          });
        } catch (err) {
          setSaving(false);
          setClientError(err instanceof Error ? err.message : "Le fichier n’a pas pu être envoyé.");
        }
      }}
    >
      <FormBusyOverlay
        active={busy}
        title="Enregistrement en cours"
        detail="Compression des nouvelles photos sur votre appareil, puis enregistrement. Visible ensuite en boutique et à la caisse."
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
      <input name="barcode" defaultValue={barcode} placeholder="Code-barres" className="rounded-xl border px-3 py-2" />
      {brands.length ? (
        <select name="brandId" defaultValue={brandId} className="rounded-xl border px-3 py-2">
          <option value="">Marque</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      ) : null}
      {suppliers.length ? (
        <select name="supplierId" defaultValue={supplierId} className="rounded-xl border px-3 py-2">
          <option value="">Fournisseur</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : null}
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
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNew" defaultChecked={isNew} /> Nouveauté
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="onlineVisible" defaultChecked={onlineVisible} /> Publié en boutique
      </label>
      {remainingPhotos > 0 ? (
        <label className="text-sm md:col-span-2">
          Ajouter des photos ({photoCount}/{MAX_PRODUCT_PHOTOS})
          <input
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </label>
      ) : null}
      {!hasVideo ? <VideoInput label={`Ajouter une vidéo (40 s / 3,5 Mo max)`} /> : null}
      <PendingSubmitButton
        idle="Enregistrer"
        pendingLabel="Enregistrement…"
        pending={busy}
        className="rounded-full bg-brown py-3 text-cream disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
      />
    </form>
  );
}
