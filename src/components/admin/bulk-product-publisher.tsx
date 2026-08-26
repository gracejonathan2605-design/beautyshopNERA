"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveProduct } from "@/app/actions/admin";
import { CategorySelect } from "@/components/admin/category-select";
import { FormBusyOverlay } from "@/components/admin/form-pending";
import { fillBulkProductFormData, type BulkFieldValues } from "@/lib/bulk-form";
import {
  BULK_IMAGE_ACCEPT,
  MAX_BULK_PRODUCTS,
  bulkDraftIssues,
  bulkImageRejection,
  suggestNameFromFile,
} from "@/lib/bulk-products";
import { compressImageFile } from "@/lib/client-compress";
import { ACTION_PAYLOAD_MAX_BYTES } from "@/lib/product-media";
import { wrapProductAction } from "@/lib/product-form-submit";
import type { CategoryOptionGroup } from "@/lib/catalog";

const saveOne = wrapProductAction(saveProduct);

type Status = "draft" | "publishing" | "ok" | "error";

type Draft = BulkFieldValues & {
  id: string;
  file: File;
  previewUrl: string;
  status: Status;
  error?: string;
  warning?: string;
};

const EMPTY_FIELDS: BulkFieldValues = {
  name: "",
  shortDescription: "",
  description: "",
  salePrice: "",
  promoPrice: "",
  costPrice: "",
  categoryId: "",
  brandId: "",
  supplierId: "",
  stock: "",
  sku: "",
  barcode: "",
  isFeatured: false,
  isPromo: false,
  isNew: true,
  onlineVisible: true,
};

function newId() {
  return crypto.randomUUID();
}

export function BulkProductPublisher({
  categoryGroups,
  brands,
  suppliers,
}: {
  categoryGroups: CategoryOptionGroup[];
  brands: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState<Draft[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [pickerError, setPickerError] = useState("");
  const [defaults, setDefaults] = useState({
    categoryId: "",
    brandId: "",
    supplierId: "",
    stock: "",
    isNew: true,
    onlineVisible: true,
  });
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      for (const row of rowsRef.current) URL.revokeObjectURL(row.previewUrl);
    };
  }, []);

  const stats = useMemo(() => {
    const ready = rows.filter((row) => bulkDraftIssues(row).length === 0 && row.status !== "ok");
    const missing = rows.filter((row) => bulkDraftIssues(row).length > 0 && row.status !== "ok");
    const failed = rows.filter((row) => row.status === "error");
    const published = rows.filter((row) => row.status === "ok");
    return { ready, missing, failed, published, total: rows.length };
  }, [rows]);

  function addFiles(list: FileList | File[]) {
    setPickerError("");
    const incoming = Array.from(list);
    if (!incoming.length) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      const issue = bulkImageRejection(file);
      if (issue) rejected.push(`${file.name} : ${issue}`);
      else accepted.push(file);
    }
    if (!accepted.length) {
      setPickerError(rejected[0] || "Choisissez des photos jpeg, png, webp, gif ou HEIC.");
      return;
    }
    const room = MAX_BULK_PRODUCTS - rowsRef.current.length;
    if (room <= 0) {
      setPickerError(`Maximum ${MAX_BULK_PRODUCTS} produits par lot.`);
      return;
    }
    const taken = accepted.slice(0, room);
    const extras: string[] = [];
    if (accepted.length > room) extras.push(`Seules ${room} photo(s) ont été ajoutées (max ${MAX_BULK_PRODUCTS}).`);
    if (rejected.length) extras.push(rejected.slice(0, 3).join(" "));
    if (extras.length) setPickerError(extras.join(" "));
    setRows((current) => [
      ...current,
      ...taken.map((file) => ({
        id: newId(),
        file,
        previewUrl: URL.createObjectURL(file),
        ...EMPTY_FIELDS,
        name: suggestNameFromFile(file.name),
        categoryId: defaults.categoryId,
        brandId: defaults.brandId,
        supplierId: defaults.supplierId,
        stock: defaults.stock,
        isNew: defaults.isNew,
        onlineVisible: defaults.onlineVisible,
        status: "draft" as const,
      })),
    ]);
  }

  function patch(id: string, update: Partial<Draft>) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...update };
        if (row.status === "error" && update.status === undefined) {
          next.status = "draft";
          next.error = undefined;
        }
        return next;
      }),
    );
  }

  function removeRow(id: string) {
    setRows((current) => {
      const row = current.find((item) => item.id === id);
      if (row) URL.revokeObjectURL(row.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function replacePhoto(id: string, file: File | undefined) {
    if (!file) return;
    const issue = bulkImageRejection(file);
    if (issue) {
      setPickerError(issue);
      return;
    }
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        URL.revokeObjectURL(row.previewUrl);
        return {
          ...row,
          file,
          previewUrl: URL.createObjectURL(file),
          name: row.name.trim() ? row.name : suggestNameFromFile(file.name),
          status: row.status === "ok" ? "ok" : "draft",
          error: undefined,
        };
      }),
    );
  }

  function applyDefaults() {
    setRows((current) =>
      current.map((row) =>
        row.status === "ok"
          ? row
          : {
              ...row,
              categoryId: defaults.categoryId || row.categoryId,
              brandId: defaults.brandId || row.brandId,
              supplierId: defaults.supplierId || row.supplierId,
              stock: defaults.stock || row.stock,
              isNew: defaults.isNew,
              onlineVisible: defaults.onlineVisible,
            },
      ),
    );
  }

  async function publish(ids: string[]) {
    if (!ids.length || publishing) return;
    setPublishing(true);
    setSummary("");
    let okCount = 0;
    let failCount = 0;
    const total = ids.length;
    setProgress({ done: 0, total });
    for (const [index, id] of ids.entries()) {
      setProgress({ done: index + 1, total });
      const row = rowsRef.current.find((item) => item.id === id);
      if (!row || row.status === "ok") continue;
      const issues = bulkDraftIssues(row);
      if (issues.length) {
        failCount += 1;
        patch(id, { status: "error", error: `Informations manquantes : ${issues.join(", ")}.` });
        continue;
      }
      patch(id, { status: "publishing", error: undefined, warning: undefined });
      try {
        const fd = new FormData();
        fillBulkProductFormData(fd, row);
        const photo = await compressImageFile(row.file);
        if (photo.size > ACTION_PAYLOAD_MAX_BYTES) {
          throw new Error("La photo compressée dépasse encore la taille d’envoi. Choisissez une image plus légère.");
        }
        fd.append("photos", photo);
        const result = await saveOne(null, fd);
        if (!result.ok) throw new Error(result.error || "Publication impossible.");
        okCount += 1;
        patch(id, { status: "ok", error: undefined, warning: result.warning });
      } catch (err) {
        failCount += 1;
        patch(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Publication impossible.",
        });
      }
      setProgress({ done: index + 1, total });
    }
    setPublishing(false);
    if (!failCount) setSummary(`${okCount} produit${okCount > 1 ? "s" : ""} publié${okCount > 1 ? "s" : ""} avec succès.`);
    else setSummary(`${okCount} produit${okCount > 1 ? "s" : ""} publié${okCount > 1 ? "s" : ""} — ${failCount} produit${failCount > 1 ? "s" : ""} nécessitent une correction.`);
  }

  return (
    <div className="space-y-6">
      <FormBusyOverlay
        active={publishing}
        title={progress ? `Publication : ${progress.done}/${progress.total} produits` : "Publication en cours"}
        detail="Compression de la photo sur votre appareil, puis création en boutique et à la caisse. Ne fermez pas la page."
      />

      <label
        className="block cursor-pointer rounded-2xl border border-dashed border-[#d8c4cc] bg-white p-6 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
        }}
      >
        <p className="font-serif text-2xl text-wine">Choisir 10 à {MAX_BULK_PRODUCTS} photos</p>
        <p className="mt-1 text-sm text-black/55">
          Une photo = un produit. Jpeg, png, webp, gif ou HEIC iPhone — 20 Mo max, compression automatique. Glissez-déposez ou sélectionnez.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={BULK_IMAGE_ACCEPT}
          multiple
          className="mt-4 w-full max-w-md rounded-xl border px-3 py-2 text-sm"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {pickerError ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{pickerError}</p> : null}

      {rows.length ? (
        <section className="rounded-2xl bg-cream p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Valeurs rapides</p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <CategorySelect
              groups={categoryGroups}
              name="defaultCategory"
              required={false}
              value={defaults.categoryId}
              onChange={(event) => setDefaults((current) => ({ ...current, categoryId: event.target.value }))}
            />
            {brands.length ? (
              <select
                value={defaults.brandId}
                onChange={(event) => setDefaults((current) => ({ ...current, brandId: event.target.value }))}
                className="rounded-xl border px-3 py-2"
              >
                <option value="">Marque</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            ) : null}
            {suppliers.length ? (
              <select
                value={defaults.supplierId}
                onChange={(event) => setDefaults((current) => ({ ...current, supplierId: event.target.value }))}
                className="rounded-xl border px-3 py-2"
              >
                <option value="">Fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              value={defaults.stock}
              onChange={(event) => setDefaults((current) => ({ ...current, stock: event.target.value }))}
              placeholder="Stock"
              className="rounded-xl border px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={defaults.isNew}
                onChange={(event) => setDefaults((current) => ({ ...current, isNew: event.target.checked }))}
              />
              Nouveauté
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={defaults.onlineVisible}
                onChange={(event) => setDefaults((current) => ({ ...current, onlineVisible: event.target.checked }))}
              />
              Publier en boutique
            </label>
            <button type="button" onClick={applyDefaults} className="rounded-full border px-4 py-2 text-sm">
              Appliquer à tous
            </button>
          </div>
        </section>
      ) : null}

      {rows.length ? (
        <section className="rounded-2xl border border-[#eee0e6] bg-white p-4">
          <p className="font-serif text-2xl text-wine">Récapitulatif</p>
          <ul className="mt-2 text-sm text-black/65">
            <li>{stats.total} produit{stats.total > 1 ? "s" : ""} dans le lot</li>
            <li>{stats.ready.length} prêt{stats.ready.length > 1 ? "s" : ""} à publier</li>
            <li>{stats.missing.length} avec informations manquantes</li>
            <li>{stats.failed.length} en erreur</li>
            <li>{stats.published.length} déjà publié{stats.published.length > 1 ? "s" : ""}</li>
          </ul>
          {stats.missing.length ? (
            <p className="mt-2 text-sm text-wine">Corrigez les fiches incomplètes (nom, catégorie, prix) avant de publier.</p>
          ) : null}
          {summary ? (
            <p
              className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                stats.failed.length ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {summary}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={publishing || !stats.ready.length}
              onClick={() => publish(stats.ready.map((row) => row.id))}
              className="rounded-full bg-brown px-5 py-3 text-cream disabled:opacity-40"
            >
              Publier les {stats.ready.length} produit{stats.ready.length > 1 ? "s" : ""}
            </button>
            {stats.failed.length ? (
              <button
                type="button"
                disabled={publishing}
                onClick={() => publish(stats.failed.map((row) => row.id))}
                className="rounded-full border px-5 py-3 text-sm"
              >
                Réessayer les {stats.failed.length} échec{stats.failed.length > 1 ? "s" : ""}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {rows.length ? (
        <div className="sticky bottom-4 z-20 flex flex-wrap gap-2 rounded-2xl border border-[#eee0e6] bg-white/95 p-3 shadow-lg backdrop-blur md:hidden">
          <button
            type="button"
            disabled={publishing || !stats.ready.length}
            onClick={() => publish(stats.ready.map((row) => row.id))}
            className="flex-1 rounded-full bg-brown px-4 py-3 text-sm text-cream disabled:opacity-40"
          >
            Publier les {stats.ready.length}
          </button>
          {stats.failed.length ? (
            <button
              type="button"
              disabled={publishing}
              onClick={() => publish(stats.failed.map((row) => row.id))}
              className="rounded-full border px-4 py-3 text-sm"
            >
              Réessayer
            </button>
          ) : null}
        </div>
      ) : null}

      <ol className="space-y-4">
        {rows.map((row, index) => {
          const issues = bulkDraftIssues(row);
          return (
            <li
              key={row.id}
              className={`rounded-2xl border p-4 ${
                row.status === "ok"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : row.status === "error"
                    ? "border-red-200 bg-red-50/70"
                    : "border-[#eee0e6] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Produit {index + 1}</p>
                <div className="flex gap-2">
                  {row.status !== "ok" ? (
                    <label className="cursor-pointer rounded-full border px-3 py-1 text-xs">
                      Remplacer la photo
                      <input
                        type="file"
                        accept={BULK_IMAGE_ACCEPT}
                        className="sr-only"
                        onChange={(event) => replacePhoto(row.id, event.target.files?.[0])}
                      />
                    </label>
                  ) : null}
                  <button type="button" onClick={() => removeRow(row.id)} className="rounded-full px-3 py-1 text-xs text-red-700">
                    Retirer
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[8rem_1fr]">
                <div className="relative h-32 overflow-hidden rounded-xl bg-[#e8dcc8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.previewUrl} alt={`Produit ${index + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-brown px-2 py-0.5 text-[11px] text-cream">
                    {index + 1}
                  </span>
                </div>
                <fieldset
                  disabled={row.status === "ok" || row.status === "publishing"}
                  className="grid gap-2 md:grid-cols-2 disabled:opacity-70"
                >
                  <input
                    value={row.name}
                    onChange={(event) => patch(row.id, { name: event.target.value, status: row.status === "ok" ? "ok" : "draft" })}
                    placeholder="Nom du produit *"
                    className="rounded-xl border px-3 py-2 md:col-span-2"
                  />
                  <CategorySelect
                    groups={categoryGroups}
                    name={`category-${row.id}`}
                    value={row.categoryId}
                    onChange={(event) => patch(row.id, { categoryId: event.target.value })}
                    className="rounded-xl border px-3 py-2 md:col-span-2"
                  />
                  <input
                    value={row.salePrice}
                    onChange={(event) => patch(row.id, { salePrice: event.target.value })}
                    placeholder="Prix vente FCFA *"
                    inputMode="numeric"
                    className="rounded-xl border px-3 py-2"
                  />
                  <input
                    value={row.promoPrice}
                    onChange={(event) => patch(row.id, { promoPrice: event.target.value })}
                    placeholder="Prix promo"
                    inputMode="numeric"
                    className="rounded-xl border px-3 py-2"
                  />
                  <input
                    value={row.costPrice}
                    onChange={(event) => patch(row.id, { costPrice: event.target.value })}
                    placeholder="Prix achat"
                    inputMode="numeric"
                    className="rounded-xl border px-3 py-2"
                  />
                  <input
                    value={row.stock}
                    onChange={(event) => patch(row.id, { stock: event.target.value })}
                    placeholder="Stock"
                    inputMode="numeric"
                    className="rounded-xl border px-3 py-2"
                  />
                  <input
                    value={row.sku}
                    onChange={(event) => patch(row.id, { sku: event.target.value })}
                    placeholder="SKU (auto si vide)"
                    className="rounded-xl border px-3 py-2"
                  />
                  <input
                    value={row.barcode}
                    onChange={(event) => patch(row.id, { barcode: event.target.value })}
                    placeholder="Code-barres"
                    className="rounded-xl border px-3 py-2"
                  />
                  {brands.length ? (
                    <select
                      value={row.brandId}
                      onChange={(event) => patch(row.id, { brandId: event.target.value })}
                      className="rounded-xl border px-3 py-2"
                    >
                      <option value="">Marque</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {suppliers.length ? (
                    <select
                      value={row.supplierId}
                      onChange={(event) => patch(row.id, { supplierId: event.target.value })}
                      className="rounded-xl border px-3 py-2"
                    >
                      <option value="">Fournisseur</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    value={row.shortDescription}
                    onChange={(event) => patch(row.id, { shortDescription: event.target.value })}
                    placeholder="Petite description"
                    className="rounded-xl border px-3 py-2 md:col-span-2"
                  />
                  <textarea
                    value={row.description}
                    onChange={(event) => patch(row.id, { description: event.target.value })}
                    placeholder="Description"
                    rows={2}
                    className="rounded-xl border px-3 py-2 md:col-span-2"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={row.isFeatured} onChange={(event) => patch(row.id, { isFeatured: event.target.checked })} />
                    Vedette
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={row.isPromo} onChange={(event) => patch(row.id, { isPromo: event.target.checked })} />
                    Promo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={row.isNew} onChange={(event) => patch(row.id, { isNew: event.target.checked })} />
                    Nouveauté
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.onlineVisible}
                      onChange={(event) => patch(row.id, { onlineVisible: event.target.checked })}
                    />
                    En boutique
                  </label>
                </fieldset>
              </div>
              {row.status === "publishing" ? (
                <p className="mt-2 text-sm text-wine">Compression et publication en cours…</p>
              ) : null}
              {issues.length && row.status !== "ok" && row.status !== "publishing" ? (
                <p className="mt-2 text-xs text-wine">{issues.join(" · ")}</p>
              ) : null}
              {row.status === "error" && row.error ? (
                <p className="mt-2 text-sm text-red-800">Échec produit {index + 1} : {row.error}</p>
              ) : null}
              {row.status === "ok" ? (
                <p className="mt-2 text-sm text-emerald-800">
                  Publié.{row.warning ? ` ${row.warning}` : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
