"use client";

import { useActionState, useState } from "react";
import { updateProduct, type ProductFormState } from "@/app/actions/admin";
import { VideoInput, readVideoDuration } from "@/components/admin/video-input";
import { CategorySelect } from "@/components/admin/category-select";
import { MAX_PRODUCT_PHOTOS, MAX_VIDEO_SECONDS } from "@/lib/product-media";
import type { CategoryOptionGroup } from "@/lib/catalog";

const INITIAL: ProductFormState = { ok: false };

export function ProductEditForm({
  productId,
  name,
  categoryId,
  salePrice,
  costPrice,
  shortDescription,
  isFeatured,
  photoCount,
  hasVideo,
  categoryGroups,
}: {
  productId: string;
  name: string;
  categoryId: string;
  salePrice: number;
  costPrice: number;
  shortDescription: string;
  isFeatured: boolean;
  photoCount: number;
  hasVideo: boolean;
  categoryGroups: CategoryOptionGroup[];
}) {
  const [state, action, pending] = useActionState(updateProduct, INITIAL);
  const [clientError, setClientError] = useState("");
  const remainingPhotos = MAX_PRODUCT_PHOTOS - photoCount;

  return (
    <form
      className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setClientError("");
        const form = event.currentTarget;
        const photos = (form.elements.namedItem("photos") as HTMLInputElement | null)?.files;
        if (photos && photos.length > remainingPhotos) {
          setClientError(`Maximum ${MAX_PRODUCT_PHOTOS} photos. Il reste ${remainingPhotos} emplacement(s).`);
          return;
        }
        const video = (form.elements.namedItem("video") as HTMLInputElement | null)?.files?.[0];
        if (video) {
          try {
            const seconds = await readVideoDuration(video);
            if (seconds > MAX_VIDEO_SECONDS) {
              setClientError("La vidéo doit durer 40 secondes maximum.");
              return;
            }
            const hidden = form.elements.namedItem("videoDuration") as HTMLInputElement;
            hidden.value = String(seconds);
          } catch {
            setClientError("Impossible de lire la vidéo. Utilisez un fichier mp4.");
            return;
          }
        }
        action(new FormData(form));
      }}
    >
      {clientError || state.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 md:col-span-2">{clientError || state.error}</p>
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
      <input name="costPrice" defaultValue={costPrice} className="rounded-xl border px-3 py-2" />
      <input
        name="shortDescription"
        defaultValue={shortDescription}
        className="rounded-xl border px-3 py-2 md:col-span-2"
      />
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="isFeatured" defaultChecked={isFeatured} /> Vedette
      </label>
      {remainingPhotos > 0 ? (
        <label className="text-sm md:col-span-2">
          Ajouter des photos ({photoCount}/{MAX_PRODUCT_PHOTOS})
          <input name="photos" type="file" accept="image/*" multiple className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
      ) : null}
      {!hasVideo ? <VideoInput label="Ajouter une vidéo (40 s max)" /> : null}
      <button disabled={pending} className="rounded-full bg-brown py-2 text-cream disabled:opacity-60 md:col-span-2">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
