"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveProduct, type ProductFormState } from "@/app/actions/admin";
import { VideoInput, readVideoDuration } from "@/components/admin/video-input";
import { MAX_PRODUCT_PHOTOS, MAX_VIDEO_SECONDS } from "@/lib/product-media";

const INITIAL: ProductFormState = { ok: false };

export function ProductForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveProduct, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState("");

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setClientError("");
        const form = event.currentTarget;
        const photos = (form.elements.namedItem("photos") as HTMLInputElement).files;
        if (photos && photos.length > MAX_PRODUCT_PHOTOS) {
          setClientError(`Maximum ${MAX_PRODUCT_PHOTOS} photos.`);
          return;
        }
        const video = (form.elements.namedItem("video") as HTMLInputElement).files?.[0];
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
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 md:col-span-4">{clientError || state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-4">
          {state.warning ?? `${state.name} a été ajouté à la boutique et à la caisse.`}
        </p>
      ) : null}
      <input name="name" required placeholder="Nom du produit" className="rounded-xl border px-3 py-2 md:col-span-2" />
      <select name="categoryId" required className="rounded-xl border px-3 py-2">
        <option value="">Catégorie (obligatoire)</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input name="salePrice" inputMode="numeric" required placeholder="Prix vente (FCFA)" className="rounded-xl border px-3 py-2" />
      <input name="costPrice" inputMode="numeric" placeholder="Prix achat (FCFA)" className="rounded-xl border px-3 py-2" />
      <input name="stock" inputMode="numeric" placeholder="Stock initial" className="rounded-xl border px-3 py-2" />
      <input name="shortDescription" placeholder="Petite description" className="rounded-xl border px-3 py-2 md:col-span-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFeatured" /> Vedette
      </label>
      <p className="text-xs text-black/50 md:col-span-4">
        SKU généré automatiquement. Le produit apparaît tout de suite en boutique et à la caisse.
      </p>
      <label className="text-sm md:col-span-2">
        Photos (1 à {MAX_PRODUCT_PHOTOS}) — compressées automatiquement en WebP
        <input
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
        />
      </label>
      <VideoInput />
      <button disabled={pending} className="rounded-full bg-brown py-2 text-cream disabled:opacity-60 md:col-span-4">
        {pending ? "Enregistrement et compression…" : "Créer le produit"}
      </button>
    </form>
  );
}
