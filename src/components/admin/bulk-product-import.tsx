"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProduct } from "@/app/actions/admin";
import { CategorySelect } from "@/components/admin/category-select";
import { FormBusyOverlay } from "@/components/admin/form-pending";
import type { CategoryOptionGroup } from "@/lib/catalog";
import { MAX_BULK_IMPORT } from "@/lib/product-media";
import {
  bulkDraftError,
  buildBulkProductFormData,
  nameFromPhotoFile,
  wrapProductAction,
} from "@/lib/product-form-submit";

const saveProductSafe = wrapProductAction(saveProduct);

type Draft = {
  id: string;
  file: File;
  preview: string;
  name: string;
  categoryId: string;
  salePrice: string;
  shortDescription: string;
  stock: string;
  status: "idle" | "ok" | "error";
  message?: string;
};

export function BulkProductImport({
  categoryGroups,
  brands = [],
  suppliers = [],
}: {
  categoryGroups: CategoryOptionGroup[];
  brands?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultStock, setDefaultStock] = useState("");
  const [brandId, setBrandId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [onlineVisible, setOnlineVisible] = useState(true);
  const [isNew, setIsNew] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [summary, setSummary] = useState("");
  const noCategories = categoryGroups.length === 0;

  const draftsRef = useRef<Draft[]>([]);
  draftsRef.current = drafts;

  useEffect(() => {
    return () => {
      draftsRef.current.forEach((row) => URL.revokeObjectURL(row.preview));
    };
  }, []);

  const pendingCount = useMemo(() => drafts.filter((row) => row.status !== "ok").length, [drafts]);

  function addFiles(list: FileList | File[]) {
    const images = Array.from(list).filter((file) => file.type.startsWith("image/"));
    const room = Math.max(0, MAX_BULK_IMPORT - drafts.length);
    setSummary(
      images.length > room ? `Maximum ${MAX_BULK_IMPORT} photos. Les fichiers en trop n’ont pas été ajoutés.` : "",
    );
    setDrafts((current) => {
      const available = Math.max(0, MAX_BULK_IMPORT - current.length);
      const next = images.slice(0, available).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        name: nameFromPhotoFile(file),
        categoryId: defaultCategoryId,
        salePrice: defaultPrice,
        shortDescription: "",
        stock: defaultStock,
        status: "idle" as const,
      }));
      return [...current, ...next];
    });
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeDraft(id: string) {
    setDrafts((current) => {
      const row = current.find((item) => item.id === id);
      if (row) URL.revokeObjectURL(row.preview);
      return current.filter((item) => item.id !== id);
    });
  }

  function applyDefaultsToEmpty() {
    setDrafts((current) =>
      current.map((row) =>
        row.status === "ok"
          ? row
          : {
              ...row,
              categoryId: row.categoryId || defaultCategoryId,
              salePrice: row.salePrice || defaultPrice,
              stock: row.stock || defaultStock,
            },
      ),
    );
  }

  async function publishAll() {
    if (noCategories) return;
    const todo = drafts.filter((row) => row.status !== "ok");
    if (!todo.length) {
      setSummary("Tous ces produits sont déjà publiés.");
      return;
    }
    const invalid = todo.find((row) => bulkDraftError(row));
    if (invalid) {
      setSummary(`Complétez d’abord : ${invalid.name || "une fiche"} — ${bulkDraftError(invalid)}`);
      return;
    }
    setBusy(true);
    setSummary("");
    let ok = 0;
    let failed = 0;
    for (let index = 0; index < todo.length; index++) {
      const row = todo[index];
      setProgress(`Publication ${index + 1} / ${todo.length} — ${row.name}`);
      try {
        const fd = await buildBulkProductFormData({
          name: row.name,
          categoryId: row.categoryId,
          salePrice: row.salePrice,
          shortDescription: row.shortDescription,
          stock: row.stock,
          brandId,
          supplierId,
          onlineVisible,
          isNew,
          photo: row.file,
        });
        const result = await saveProductSafe(null, fd);
        if (result.ok) {
          ok += 1;
          updateDraft(row.id, { status: "ok", message: result.warning ?? result.name });
        } else {
          failed += 1;
          updateDraft(row.id, { status: "error", message: result.error ?? "Publication impossible." });
        }
      } catch (err) {
        failed += 1;
        updateDraft(row.id, {
          status: "error",
          message: err instanceof Error ? err.message : "Publication impossible.",
        });
      }
    }
    setBusy(false);
    setProgress("");
    setSummary(
      failed
        ? `${ok} publié(s), ${failed} en erreur. Corrigez les fiches rouges puis réessayez.`
        : `${ok} produit(s) en boutique et à la caisse.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <FormBusyOverlay
        active={busy}
        title="Publication en lot"
        detail={progress || "Compression et envoi, un produit après l’autre. Ne fermez pas la page."}
      />
      <div className="rounded-2xl bg-cream p-5">
        <p className="text-sm text-black/60">
          Choisissez plusieurs photos d’un coup. Chaque image devient un produit : vous remplissez nom, rayon et prix,
          puis vous publiez tout. Les photos sont compressées automatiquement. Maximum {MAX_BULK_IMPORT} à la fois.
        </p>
        <label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-brown/40 bg-white px-4 py-8 text-center">
          <span className="font-medium text-wine">Importer des photos</span>
          <span className="mt-1 block text-sm text-black/50">jpeg, png ou webp — pas HEIC. Vous pourrez encore modifier chaque fiche.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            disabled={noCategories || busy}
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {noCategories ? (
          <p className="mt-3 text-sm text-amber-900">Installez d’abord les rayons (Catégories) avant l’import.</p>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="text-sm md:col-span-2">
            Rayon par défaut
            <CategorySelect
              groups={categoryGroups}
              name="defaultCategory"
              required={false}
              value={defaultCategoryId}
              onChange={(event) => setDefaultCategoryId(event.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Prix par défaut (FCFA)
            <input
              value={defaultPrice}
              onChange={(event) => setDefaultPrice(event.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Stock par défaut
            <input
              value={defaultStock}
              onChange={(event) => setDefaultStock(event.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          {brands.length ? (
            <select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="rounded-xl border px-3 py-2">
              <option value="">Marque (optionnel)</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          ) : null}
          {suppliers.length ? (
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="rounded-xl border px-3 py-2"
            >
              <option value="">Fournisseur (optionnel)</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlineVisible} onChange={(event) => setOnlineVisible(event.target.checked)} />
            Publier en boutique
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isNew} onChange={(event) => setIsNew(event.target.checked)} />
            Nouveauté
          </label>
        </div>
        <p className="mt-3 text-xs text-black/50">
          Si « Publier en boutique » est coché, chaque produit entre dans FLASH NERA à sa première mise en ligne. Décochez
          pour préparer sans afficher.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={applyDefaultsToEmpty}
            disabled={!drafts.length || busy}
            className="rounded-full border border-brown px-4 py-2 text-sm text-brown disabled:opacity-50"
          >
            Appliquer rayon / prix / stock aux fiches vides
          </button>
          <button
            type="button"
            onClick={publishAll}
            disabled={!pendingCount || busy || noCategories}
            className="rounded-full bg-brown px-5 py-2 text-sm text-cream disabled:opacity-50"
          >
            Publier {pendingCount ? `${pendingCount} produit(s)` : "les produits"}
          </button>
        </div>
        {summary ? <p className="mt-3 text-sm text-wine">{summary}</p> : null}
      </div>

      {drafts.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((row) => {
            const issue = row.status === "error" ? row.message : bulkDraftError(row);
            return (
              <article
                key={row.id}
                className={`rounded-2xl border bg-white p-4 ${
                  row.status === "ok"
                    ? "border-emerald-200"
                    : row.status === "error"
                      ? "border-red-200"
                      : "border-[#eee0e6]"
                }`}
              >
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.preview} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover bg-[#e8dcc8]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      value={row.name}
                      onChange={(event) => updateDraft(row.id, { name: event.target.value, status: "idle" })}
                      placeholder="Nom du produit"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      disabled={row.status === "ok"}
                    />
                    <CategorySelect
                      groups={categoryGroups}
                      name={`category-${row.id}`}
                      value={row.categoryId}
                      onChange={(event) => updateDraft(row.id, { categoryId: event.target.value, status: "idle" })}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    value={row.salePrice}
                    onChange={(event) => updateDraft(row.id, { salePrice: event.target.value, status: "idle" })}
                    placeholder="Prix FCFA"
                    inputMode="numeric"
                    className="rounded-xl border px-3 py-2 text-sm"
                    disabled={row.status === "ok"}
                  />
                  <input
                    value={row.stock}
                    onChange={(event) => updateDraft(row.id, { stock: event.target.value, status: "idle" })}
                    placeholder="Stock"
                    inputMode="numeric"
                    className="rounded-xl border px-3 py-2 text-sm"
                    disabled={row.status === "ok"}
                  />
                  <input
                    value={row.shortDescription}
                    onChange={(event) => updateDraft(row.id, { shortDescription: event.target.value })}
                    placeholder="Petite description (optionnel)"
                    className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                    disabled={row.status === "ok"}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className={`text-xs ${row.status === "ok" ? "text-emerald-800" : issue ? "text-red-700" : "text-black/40"}`}>
                    {row.status === "ok" ? row.message ?? "Publié" : issue ?? "Prêt"}
                  </p>
                  {row.status !== "ok" ? (
                    <button type="button" onClick={() => removeDraft(row.id)} className="text-xs text-brown underline">
                      Retirer
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
