export const MAX_GENERATED_VARIANTS = 80;

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const CLOTHING_COLORS = ["Noir", "Blanc", "Beige", "Marron", "Rose", "Rouge", "Bleu", "Vert", "Bordeaux", "Camel"];
const HAIR_LENGTHS = ["10 pouces", "12 pouces", "14 pouces", "16 pouces", "18 pouces", "20 pouces", "22 pouces", "24 pouces", "26 pouces", "28 pouces"];
const HAIR_SHADES = ["1", "1B", "2", "4", "27", "30", "33", "99J", "613", "Ombre"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43"];
const SHOE_COLORS = ["Noir", "Blanc", "Beige", "Marron", "Camel", "Or", "Argent", "Rose", "Rouge", "Nude"];
const BAG_COLORS = ["Noir", "Blanc", "Beige", "Marron", "Camel", "Bordeaux", "Rose", "Rouge", "Or", "Vert"];
const SKIN_RANGES = ["Peaux sèches", "Peaux normales", "Peaux sensibles", "Hydratation", "Réparateur", "Éclaircissant", "Anti-taches", "Karité", "Amande", "Monoï"];
const BODY_SIZES = ["50 ml", "200 ml", "250 ml", "400 ml", "500 ml"];
const FACE_TYPES = ["Sèche", "Normale", "Mixte", "Grasse", "Sensible", "Anti-taches", "Anti-acné"];
const FACE_SIZES = ["30 ml", "50 ml", "100 ml", "200 ml"];
const COMPLEXION = ["Porcelain", "Ivoire", "Beige clair", "Beige", "Nude", "Caramel", "Miel", "Chocolat", "Ébène", "Expresso"];
const FINISHES = ["Mat", "Satiné", "Lumineux"];
const LIP_SHADES = ["Nude", "Beige", "Rose", "Corail", "Rouge", "Bordeaux", "Prune", "Marron", "Mauve", "Transparent"];
const LIP_FINISHES = ["Mat", "Satiné", "Brillant", "Crayon"];
const EYE_COLORS = ["Noir", "Brun", "Bleu", "Vert", "Prune", "Doré"];
const HAIR_CARE = ["Secs", "Crépus", "Colorés", "Normaux", "Antipelliculaire"];
const HAIR_VOLUMES = ["100 ml", "250 ml", "500 ml", "1 L"];
const DYE_SHADES = ["1", "1B", "2", "4", "5", "6", "7", "27", "30", "Blond"];
const NAIL_SHADES = ["Nude", "Rose", "Rouge", "Bordeaux", "Noir", "Blanc", "Transparent", "Corail", "Prune", "Pailleté"];
const FRAGRANCE_SIZES = ["15 ml", "30 ml", "50 ml", "100 ml"];
const METALS = ["Or", "Argent", "Doré", "Rose gold", "Noir"];
const PACKS = ["Tube", "Pot", "Spray", "Stick", "Recharge"];

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
    id: "corps",
    label: "Gammes de soin corps",
    dimensions: [
      { id: "gamme", label: "Gamme", values: SKIN_RANGES },
      { id: "contenance", label: "Contenance", values: BODY_SIZES },
    ],
  },
  {
    id: "visage",
    label: "Soin du visage",
    dimensions: [
      { id: "peau", label: "Type de peau", values: FACE_TYPES },
      { id: "contenance", label: "Contenance", values: FACE_SIZES },
    ],
  },
  {
    id: "teint",
    label: "Fond de teint et teint",
    dimensions: [
      { id: "teinte", label: "Teinte", values: COMPLEXION },
      { id: "fini", label: "Fini", values: FINISHES },
    ],
  },
  {
    id: "levres",
    label: "Lèvres et crayons",
    dimensions: [
      { id: "nuance", label: "Nuance", values: LIP_SHADES },
      { id: "fini", label: "Fini", values: LIP_FINISHES },
    ],
  },
  {
    id: "yeux",
    label: "Yeux, blush et fards",
    dimensions: [
      { id: "couleur", label: "Couleur", values: EYE_COLORS },
      { id: "formule", label: "Formule", values: ["Classique", "Waterproof"] },
    ],
  },
  {
    id: "cheveux",
    label: "Soin capillaire",
    dimensions: [
      { id: "cheveux", label: "Type de cheveux", values: HAIR_CARE },
      { id: "contenance", label: "Contenance", values: HAIR_VOLUMES },
    ],
  },
  {
    id: "coloration",
    label: "Coloration",
    dimensions: [
      { id: "teinte", label: "Teinte", values: DYE_SHADES },
      { id: "type", label: "Type", values: ["Permanente", "Semi-permanente", "Ton sur ton"] },
    ],
  },
  {
    id: "ongles",
    label: "Vernis et ongles",
    dimensions: [
      { id: "teinte", label: "Teinte", values: NAIL_SHADES },
      { id: "format", label: "Format", values: ["8 ml", "11 ml", "Courts", "Longs"] },
    ],
  },
  {
    id: "parfum",
    label: "Parfum",
    dimensions: [
      { id: "contenance", label: "Contenance", values: FRAGRANCE_SIZES },
      { id: "concentration", label: "Concentration", values: ["Eau de parfum", "Eau de toilette", "Brume", "Huile"] },
    ],
  },
  {
    id: "bijou",
    label: "Bijoux et accessoires",
    dimensions: [
      { id: "metal", label: "Couleur", values: METALS },
      { id: "taille", label: "Taille", values: ["Unique", "S", "M", "L"] },
    ],
  },
  {
    id: "format",
    label: "Format et conditionnement",
    dimensions: [
      { id: "conditionnement", label: "Conditionnement", values: PACKS },
      { id: "contenance", label: "Contenance", values: ["50 ml", "100 ml", "250 ml", "400 ml"] },
    ],
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
  if (/teinture|coloration/.test(value)) return "coloration";
  if (/shampoing|masque capillaire|conditionneur|leave-in|edge control|defrisant|relaxer|huile pour cheveux|serum capillaire/.test(value)) return "cheveux";
  if (/fond de teint|correcteur|poudre|primer|spray fixateur/.test(value)) return "teint";
  if (/crayon|rouge a levre|gloss|baume a levre/.test(value)) return "levres";
  if (/mascara|eyeliner|fard|blush|highlighter|palette/.test(value)) return "yeux";
  if (/vernis|faux ongle|manucure|ongles/.test(value)) return "ongles";
  if (/parfum/.test(value)) return "parfum";
  if (/chaussure|sandale|escarpin|basket|talon|pointure/.test(value)) return "chaussure";
  if (/\bsacs?\b/.test(value)) return "sac";
  if (/lait|beurre|huile corporelle|creme corporelle|creme pour|gommage|savon|gel douche|deodorant|brume corporelle|lotion|serum corps|karite|coco|vergeture|ecran solaire|soin intime|hygiene intime|cosmetique/.test(value)) return "corps";
  if (/visage|nettoyant|micellaire|hydratante|anti-acne|anti-comedon|eclaircissant|demaquillant/.test(value)) return "visage";
  if (/lingerie|vetement|robe|ceinture/.test(value)) return "vetement";
  if (/bijou|montre|lunette|chapeau|foulard|turban/.test(value)) return "bijou";
  if (/rasage|barbe|rasoir|coffret/.test(value)) return "format";
  if (/dentifrice|brosse a dents|bain de bouche|fil dentaire|colgate|hygiene buccale/.test(value)) return "format";
  if (/vaseline|complement|bebe|hydroalcoolique|bien-etre|trousse|miroir|eponge|pince\b|coton|divers/.test(value)) return "format";
  if (/soins capillaires/.test(value)) return "cheveux";
  if (/maquillage/.test(value)) return "teint";
  if (/mode/.test(value)) return "vetement";
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
