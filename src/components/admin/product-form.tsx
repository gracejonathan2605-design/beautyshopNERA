"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveProduct, type ProductFormState } from "@/app/actions/admin";
import { VideoInput } from "@/components/admin/video-input";
import { CategorySelect } from "@/components/admin/category-select";
import { FormBusyOverlay, PendingSubmitButton } from "@/components/admin/form-pending";
import { VariantEditor } from "@/components/admin/variant-editor";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-media";
import { PRODUCT_IMAGE_ACCEPT } from "@/lib/product-images";
import { prepareProductFormData, wrapProductAction } from "@/lib/product-form-submit";
import type { CategoryOptionGroup } from "@/lib/catalog";

const INITIAL: ProductFormState = { ok: false };
const saveProductSafe = wrapProductAction(saveProduct);

export function ProductForm({
  categoryGroups,
  brands = [],
  suppliers = [],
}: {
  categoryGroups: CategoryOptionGroup[];
  brands?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveProductSafe, INITIAL);
  const [, startTransition] = useTransition();
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
      onSubmit={async (event) => {
        event.preventDefault();
        setClientError("");
        if (noCategories) {
          setClientError("Installez d’abord le catalogue NERA (Catégories), puis choisissez un rayon.");
          return;
        }
        const form = event.currentTarget;
        const data = new FormData(form);
        const name = String(data.get("name") ?? "").trim();
        const categoryId = String(data.get("categoryId") ?? "").trim();
        const salePrice = String(data.get("variantSalePrice") ?? data.get("salePrice") ?? "").trim();
        const photos = (form.elements.namedItem("photos") as HTMLInputElement | null)?.files;
        if (!name) {
          setClientError("Indiquez le nom du produit.");
          return;
        }
        if (!categoryId) {
          setClientError("Choisissez une catégorie. Sans rayon, le produit n’apparaît pas en boutique.");
          return;
        }
        if (!salePrice) {
          setClientError("Indiquez un prix de vente en FCFA.");
          return;
        }
        if (photos && photos.length > MAX_PRODUCT_PHOTOS) {
          setClientError(`Maximum ${MAX_PRODUCT_PHOTOS} photos.`);
          return;
        }
        setPublishing(true);
        try {
          const fd = await prepareProductFormData(form);
          startTransition(() => {
            action(fd);
          });
        } catch (err) {
          setPublishing(false);
          setClientError(err instanceof Error ? err.message : "Le fichier n’a pas pu être envoyé.");
        }
      }}
    >
      <FormBusyOverlay
        active={busy}
        title="Publication en cours"
        detail="Compression des photos sur votre appareil, puis envoi. Une photo du téléphone trop lourde est réduite automatiquement. Cela peut prendre quelques secondes."
      />
      <div className="md:col-span-4">
        <h2 className="font-serif text-2xl text-wine">Publier un nouveau produit</h2>
        <p className="mt-1 text-sm text-black/55">
          Nom, rayon, prix — puis Publier. Les photos lourdes du téléphone sont réduites automatiquement (WebP, 1400 px) pour s’ouvrir vite en boutique.
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
      {brands.length ? (
        <select name="brandId" className="rounded-xl border px-3 py-2">
          <option value="">Marque (optionnel)</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      ) : null}
      {suppliers.length ? (
        <select name="supplierId" className="rounded-xl border px-3 py-2">
          <option value="">Fournisseur (optionnel)</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : null}
      <input name="shortDescription" placeholder="Petite description" className="rounded-xl border px-3 py-2 md:col-span-2" />
      <VariantEditor />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFeatured" /> Vedette
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPromo" /> Promo
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNew" defaultChecked /> Nouveauté
      </label>
      <label className="flex items-center gap-2 text-sm md:col-span-4">
        <input type="checkbox" name="onlineVisible" defaultChecked /> Publier en boutique (décocher = pas de FLASH NERA tant que ce n’est pas en ligne)
      </label>
      <p className="text-xs text-black/50 md:col-span-4">
        SKU généré automatiquement. Après publication, le produit est visible tout de suite en boutique et à la caisse.
      </p>
      <label className="text-sm md:col-span-2">
        Photos (1 à {MAX_PRODUCT_PHOTOS}) — compressées automatiquement en WebP (HEIC iPhone converti)
        <input
          name="photos"
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          multiple
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
        />
      </label>
      <VideoInput />
      <PendingSubmitButton
        idle="Publier le produit"
        pendingLabel="Publication en cours…"
        disabled={noCategories}
        pending={busy}
      />
    </form>
  );
}
