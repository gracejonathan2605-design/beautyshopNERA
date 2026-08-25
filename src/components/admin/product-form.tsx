"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveProduct, type ProductFormState } from "@/app/actions/admin";
import { VideoInput } from "@/components/admin/video-input";
import { CategorySelect } from "@/components/admin/category-select";
import { FormBusyOverlay, PendingSubmitButton } from "@/components/admin/form-pending";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-media";
import type { CategoryOptionGroup } from "@/lib/catalog";

const INITIAL: ProductFormState = { ok: false };

export function ProductForm({
  categoryGroups,
}: {
  categoryGroups: CategoryOptionGroup[];
}) {
  const [state, action, pending] = useActionState(saveProduct, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const noCategories = categoryGroups.length === 0;
  const busy = pending || publishing;
  const message = clientError || state.error;

  useEffect(() => {
    if (!pending) setPublishing(false);
  }, [pending]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setClientError("");
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="relative mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-4"
      onSubmit={(event) => {
        setClientError("");
        if (noCategories) {
          event.preventDefault();
          setClientError("Installez d’abord le catalogue NERA (Catégories), puis choisissez un rayon.");
          return;
        }
        const form = event.currentTarget;
        const name = String(new FormData(form).get("name") ?? "").trim();
        const categoryId = String(new FormData(form).get("categoryId") ?? "").trim();
        const salePrice = String(new FormData(form).get("salePrice") ?? "").trim();
        const photos = (form.elements.namedItem("photos") as HTMLInputElement | null)?.files;
        if (!name) {
          event.preventDefault();
          setClientError("Indiquez le nom du produit.");
          return;
        }
        if (!categoryId) {
          event.preventDefault();
          setClientError("Choisissez une catégorie. Sans rayon, le produit n’apparaît pas en boutique.");
          return;
        }
        if (!salePrice) {
          event.preventDefault();
          setClientError("Indiquez un prix de vente en FCFA.");
          return;
        }
        if (photos && photos.length > MAX_PRODUCT_PHOTOS) {
          event.preventDefault();
          setClientError(`Maximum ${MAX_PRODUCT_PHOTOS} photos.`);
          return;
        }
        setPublishing(true);
      }}
    >
      <FormBusyOverlay
        active={busy}
        title="Publication en cours"
        detail="Compression des photos, envoi de la vidéo si besoin, puis apparition en boutique et à la caisse. Cela peut prendre plusieurs secondes."
      />
      <div className="md:col-span-4">
        <h2 className="font-serif text-2xl text-wine">Publier un nouveau produit</h2>
        <p className="mt-1 text-sm text-black/55">
          Nom, rayon, prix — puis Publier. Un bandeau s’affiche pendant la compression des photos.
        </p>
      </div>
      {noCategories ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-4">
          Aucune catégorie.{" "}
          <Link href="/admin/categories" className="underline">
            Installer le catalogue NERA
          </Link>{" "}
          avant de publier.
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 md:col-span-4">{message}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-4">
          {state.warning ?? `${state.name} a été publié en boutique et à la caisse.`}
        </p>
      ) : null}
      <input name="name" required placeholder="Nom du produit" className="rounded-xl border px-3 py-2 md:col-span-2" />
      <CategorySelect groups={categoryGroups} className="rounded-xl border px-3 py-2 md:col-span-2" />
      <input name="salePrice" inputMode="numeric" required placeholder="Prix vente (FCFA)" className="rounded-xl border px-3 py-2" />
      <input name="promoPrice" inputMode="numeric" placeholder="Prix promo (FCFA)" className="rounded-xl border px-3 py-2" />
      <input name="costPrice" inputMode="numeric" placeholder="Prix achat (FCFA)" className="rounded-xl border px-3 py-2" />
      <input name="stock" inputMode="numeric" placeholder="Stock initial" className="rounded-xl border px-3 py-2" />
      <input name="shortDescription" placeholder="Petite description" className="rounded-xl border px-3 py-2 md:col-span-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFeatured" /> Vedette
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPromo" /> Promo
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNew" defaultChecked /> Nouveauté
      </label>
      <p className="text-xs text-black/50 md:col-span-4">
        SKU généré automatiquement. Après publication, le produit est visible tout de suite en boutique et à la caisse.
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
      <PendingSubmitButton
        idle="Publier le produit"
        pendingLabel="Publication en cours…"
        disabled={noCategories}
      />
    </form>
  );
}
