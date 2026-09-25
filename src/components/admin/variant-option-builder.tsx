"use client";

import { useEffect, useMemo, useState } from "react";
import {
  VARIANT_FAMILIES,
  combineVariantOptions,
  detectVariantFamily,
} from "@/lib/variant-options";

export function VariantOptionBuilder({
  hint = "",
  onApply,
  buttonLabel = "Créer ces variantes",
}: {
  hint?: string;
  onApply: (labels: string[]) => void;
  buttonLabel?: string;
}) {
  const detected = detectVariantFamily(hint);
  const [familyId, setFamilyId] = useState(detected);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!locked) setFamilyId(detected);
  }, [detected, locked]);

  const family = VARIANT_FAMILIES.find((row) => row.id === familyId) ?? VARIANT_FAMILIES[VARIANT_FAMILIES.length - 1];
  const labels = useMemo(() => {
    const groups = family.dimensions.map((dimension) => picked[dimension.id] ?? []);
    const extra = custom
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (extra.length) groups.push(extra);
    return combineVariantOptions(groups);
  }, [family, picked, custom]);
  const capped = labels.length >= 80;

  function toggle(dimensionId: string, value: string) {
    setPicked((current) => {
      const list = current[dimensionId] ?? [];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [dimensionId]: next };
    });
  }

  return (
    <div className="rounded-2xl border border-[#eee0e6] bg-[#fffcfb] p-3">
      <label className="block text-sm text-black/70">
        Variantes selon l’article
        <select
          value={familyId}
          onChange={(event) => {
            setLocked(true);
            setFamilyId(event.target.value);
            setPicked({});
          }}
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
        >
          {VARIANT_FAMILIES.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-black/45">
        {locked ? "Choix manuel." : hint.trim() ? "Proposé d’après la catégorie et le nom." : "Choisissez le type, puis cochez les valeurs en stock."}{" "}
        Plusieurs couleurs et plusieurs tailles donnent toutes les combinaisons.
      </p>
      <div className="mt-3 space-y-3">
        {family.dimensions.map((dimension) => (
          <div key={dimension.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-wine/70">{dimension.label}</p>
              <button
                type="button"
                onClick={() => setPicked((current) => ({ ...current, [dimension.id]: [...dimension.values] }))}
                className="text-xs text-wine underline decoration-wine/30"
              >
                Tout cocher
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {dimension.values.map((value) => {
                const active = (picked[dimension.id] ?? []).includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(dimension.id, value)}
                    className={`rounded-full border px-3 py-1 text-xs ${active ? "border-wine bg-wine text-white" : "border-[#eee0e6] bg-white text-wine"}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <label className="mt-3 block text-xs text-black/50">
        Autre variante, séparée par des virgules
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Ex. 30 pouces, Bordeaux"
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={!labels.length}
        onClick={() => onApply(labels)}
        className="mt-3 rounded-full bg-brown px-4 py-2 text-sm text-cream disabled:opacity-50"
      >
        {buttonLabel}
        {labels.length ? ` (${labels.length}${capped ? ", maximum" : ""})` : ""}
      </button>
    </div>
  );
}
