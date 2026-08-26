"use client";

import { useState } from "react";
import Image from "next/image";
import { deleteProductMedia } from "@/app/actions/admin";

type Item = {
  id: string;
  url: string;
  alt: string | null;
  kind: "IMAGE" | "VIDEO";
};

export function ProductMediaGrid({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  if (!items.length) return null;
  const allSelected = selected.length === items.length;

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  return (
    <form
      action={deleteProductMedia}
      className="mt-10"
      onSubmit={(event) => {
        if (!selected.length) {
          event.preventDefault();
          return;
        }
        const n = selected.length;
        if (!confirm(n > 1 ? `Retirer ${n} fichiers ?` : "Retirer ce fichier ?")) {
          event.preventDefault();
        }
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Photos et vidéo</h2>
          <p className="mt-1 text-sm text-black/50">Cochez plusieurs fichiers pour les retirer en une fois.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border px-4 py-2 text-sm"
            onClick={() => setSelected(allSelected ? [] : items.map((item) => item.id))}
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
          <button
            type="submit"
            disabled={!selected.length}
            className="rounded-full bg-brown px-4 py-2 text-sm text-cream disabled:opacity-40"
          >
            Retirer la sélection{selected.length ? ` (${selected.length})` : ""}
          </button>
        </div>
      </div>
      {selected.map((id) => (
        <input key={id} type="hidden" name="mediaId" value={id} />
      ))}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <figure key={item.id} className={`rounded-2xl bg-cream p-2 ${checked ? "ring-2 ring-brown" : ""}`}>
              <label className="block cursor-pointer">
                {item.kind === "VIDEO" ? (
                  <video src={item.url} className="h-32 w-full rounded-xl object-cover" preload="metadata" />
                ) : (
                  <span className="relative block h-32 overflow-hidden rounded-xl">
                    <Image src={item.url} alt={item.alt ?? ""} fill className="object-cover" sizes="200px" loading="lazy" />
                  </span>
                )}
                <span className="mt-2 flex items-center justify-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    className="accent-brown"
                  />
                  {item.kind === "VIDEO" ? "Vidéo" : "Photo"}
                </span>
              </label>
            </figure>
          );
        })}
      </div>
    </form>
  );
}
