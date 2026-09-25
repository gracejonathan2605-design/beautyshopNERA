"use client";

import { useMemo, useState } from "react";
import { VARIANT_PRESETS, combineVariantOptions } from "@/lib/variant-options";

export function VariantOptionBuilder({
  onApply,
  buttonLabel = "Créer ces variantes",
}: {
  onApply: (labels: string[]) => void;
  buttonLabel?: string;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [custom, setCustom] = useState("");

  const labels = useMemo(() => {
    const groups = VARIANT_PRESETS.map((preset) => picked[preset.id] ?? []);
    const extra = custom
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (extra.length) groups.push(extra);
    return combineVariantOptions(groups);
  }, [picked, custom]);

  function toggle(presetId: string, value: string) {
    setPicked((current) => {
      const list = current[presetId] ?? [];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [presetId]: next };
    });
  }

  return (
    <div className="rounded-2xl border border-[#eee0e6] bg-[#fffcfb] p-3">
      <p className="text-sm text-black/60">Couleur, teinte, taille, pointure ou longueur. Plusieurs choix se combinent.</p>
      <div className="mt-3 space-y-3">
        {VARIANT_PRESETS.map((preset) => (
          <div key={preset.id}>
            <p className="text-xs text-wine/70">{preset.label}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {preset.values.map((value) => {
                const active = (picked[preset.id] ?? []).includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(preset.id, value)}
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
        Autre valeur, séparée par des virgules
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Ex. 24 pouces, Bordeaux"
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
        {labels.length ? ` (${labels.length})` : ""}
      </button>
    </div>
  );
}
