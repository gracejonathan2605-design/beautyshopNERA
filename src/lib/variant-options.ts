export const VARIANT_PRESETS = [
  {
    id: "couleur",
    label: "Couleur",
    values: ["Noir", "Blanc", "Beige", "Marron", "Rose", "Rouge", "Nude", "Or", "Argent"],
  },
  {
    id: "teinte",
    label: "Teinte",
    values: ["1", "1B", "2", "4", "27", "30", "99J", "613"],
  },
  {
    id: "taille",
    label: "Taille",
    values: ["XS", "S", "M", "L", "XL", "2XL"],
  },
  {
    id: "pointure",
    label: "Pointure",
    values: ["36", "37", "38", "39", "40", "41", "42"],
  },
  {
    id: "longueur",
    label: "Longueur",
    values: ["10 pouces", "12 pouces", "14 pouces", "16 pouces", "18 pouces", "20 pouces", "22 pouces"],
  },
] as const;

export const MAX_GENERATED_VARIANTS = 24;

/** Une ligne par variante. La virgule sépare des valeurs simples. Le point médian garde « Noir · 38 » ensemble. */
export function parseVariantLabels(raw?: string | null) {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const line of text.split(/\n|;/)) {
    const chunk = line.trim();
    if (!chunk) continue;
    const parts = chunk.includes("·") ? [chunk] : chunk.split(",");
    for (const part of parts) {
      const label = part.trim();
      const key = label.toLowerCase();
      if (!label || seen.has(key)) continue;
      seen.add(key);
      labels.push(label);
    }
  }
  return labels;
}

export function formatVariantLabels(labels: string[]) {
  return labels.join("\n");
}

export function combineVariantOptions(groups: string[][]) {
  const lists = groups
    .map((group) => group.map((value) => value.trim()).filter(Boolean))
    .filter((group) => group.length > 0);
  if (!lists.length) return [];
  let names = [""];
  for (const list of lists) {
    names = names.flatMap((prefix) => list.map((value) => (prefix ? `${prefix} · ${value}` : value)));
    if (names.length > MAX_GENERATED_VARIANTS) break;
  }
  return names.slice(0, MAX_GENERATED_VARIANTS);
}
