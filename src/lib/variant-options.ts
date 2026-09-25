export const MAX_GENERATED_VARIANTS = 80;

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const CLOTHING_COLORS = ["Noir", "Blanc", "Beige", "Marron", "Rose", "Rouge", "Bleu", "Vert", "Bordeaux", "Camel"];
const HAIR_LENGTHS = ["10 pouces", "12 pouces", "14 pouces", "16 pouces", "18 pouces", "20 pouces", "22 pouces", "24 pouces", "26 pouces", "28 pouces"];
const HAIR_SHADES = ["1", "1B", "2", "4", "27", "30", "33", "99J", "613", "Ombre"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43"];
const SHOE_COLORS = ["Noir", "Blanc", "Beige", "Marron", "Camel", "Or", "Argent", "Rose", "Rouge", "Nude"];
const BAG_COLORS = ["Noir", "Blanc", "Beige", "Marron", "Camel", "Bordeaux", "Rose", "Rouge", "Or", "Vert"];
const MAKEUP_SHADES = ["Porcelain", "Ivoire", "Beige", "Nude", "Caramel", "Miel", "Chocolat", "Ébène"];
const FRAGRANCE_SIZES = ["30 ml", "50 ml", "100 ml"];

export type VariantDimension = { id: string; label: string; values: string[] };

export type VariantFamily = {
  id: string;
  label: string;
  dimensions: VariantDimension[];
};

export const VARIANT_FAMILIES: VariantFamily[] = [
  {
    id: "vetement",
    label: "Taille de vêtements",
    dimensions: [
      { id: "taille", label: "Taille", values: CLOTHING_SIZES },
      { id: "couleur", label: "Couleur", values: CLOTHING_COLORS },
    ],
  },
  {
    id: "meche",
    label: "Taille de mèches",
    dimensions: [
      { id: "longueur", label: "Longueur", values: HAIR_LENGTHS },
      { id: "teinte", label: "Teinte", values: HAIR_SHADES },
    ],
  },
  {
    id: "chaussure",
    label: "Pointure",
    dimensions: [
      { id: "pointure", label: "Pointure", values: SHOE_SIZES },
      { id: "couleur", label: "Couleur", values: SHOE_COLORS },
    ],
  },
  {
    id: "sac",
    label: "Couleurs de sacs",
    dimensions: [{ id: "couleur", label: "Couleur", values: BAG_COLORS }],
  },
  {
    id: "maquillage",
    label: "Teintes maquillage",
    dimensions: [{ id: "teinte", label: "Teinte", values: MAKEUP_SHADES }],
  },
  {
    id: "parfum",
    label: "Contenance",
    dimensions: [{ id: "contenance", label: "Contenance", values: FRAGRANCE_SIZES }],
  },
  {
    id: "autre",
    label: "Autres variantes",
    dimensions: [],
  },
];

export function plainText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function detectVariantFamily(text: string) {
  const value = plainText(text);
  if (/meche|perruque|extension|closure|frontale|ponytail|x-?pression/.test(value)) return "meche";
  if (/chaussure|sandale|escarpin|basket|talon|pointure/.test(value)) return "chaussure";
  if (/\bsacs?\b/.test(value)) return "sac";
  if (/parfum|brume/.test(value)) return "parfum";
  if (/maquillage|fond de teint|rouge a levre|fard|gloss/.test(value)) return "maquillage";
  if (/lingerie|vetement|robe|haut|pantalon|jupe|mode/.test(value)) return "vetement";
  return "autre";
}

export function categoryVariantHint(
  groups: { label: string; parentId: string; children: { id: string; name: string }[] }[],
  categoryId: string,
  productName = "",
) {
  let label = "";
  for (const group of groups) {
    if (group.parentId === categoryId) label = group.label;
    const child = group.children.find((row) => row.id === categoryId);
    if (child) label = `${group.label} ${child.name}`;
  }
  return `${label} ${productName}`.trim();
}

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
