import { slugify } from "./pricing";

const SIZE_ALIAS: Record<string, string> = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
  XXXL: "3XL",
  XXXXL: "4XL",
  "3XL": "3XL",
  "4XL": "4XL",
};

export function extractClothingSizes(name: string) {
  const marker = name.search(/\b(?:disponible\s+en|tailles?\s*:)\b/i);
  if (marker < 0) return { title: name.trim(), sizes: [] as string[] };
  const rest = name.slice(marker).replace(/^\s*(?:disponible\s+en|tailles?\s*:)\s*/i, "");
  const sizes: string[] = [];
  for (const part of rest.split(/[\s,;\/–-]+/)) {
    const key = part.toUpperCase();
    if (SIZE_ALIAS[key] && !sizes.includes(SIZE_ALIAS[key])) sizes.push(SIZE_ALIAS[key]);
  }
  return { title: name.slice(0, marker).replace(/[,–-]+\s*$/, "").trim(), sizes };
}

/** Marques de luxe dans un titre d’accessoire = nom commercial, pas une fiche officielle. */
const ACCESSORY_LUXURY = /\b(chanel|herm[eè]s)\b/gi;

const BRAND_SPELLING: [RegExp, string][] = [
  [/\bla roches?\s+posay\b/gi, "La Roche-Posay"],
  [/\bla roche[\s-]*posay\b/gi, "La Roche-Posay"],
  [/\bcerave\b/gi, "CeraVe"],
  [/\blipakar\b/gi, "Lipikar"],
  [/\blipikar\b/gi, "Lipikar"],
  [/\beffaclar\b/gi, "Effaclar"],
  [/\bnakae\b/gi, "Nakae"],
  [/\bxuping\b/gi, "Xuping"],
  [/\bstanley\b/gi, "Stanley"],
  [/\bstanlet\b/gi, "Stanley"],
];

function applyBrandSpelling(name: string) {
  let next = name;
  for (const [pattern, label] of BRAND_SPELLING) next = next.replace(pattern, label);
  return next;
}

export function cleanProductTitle(raw: string) {
  let name = String(raw ?? "").replace(/\s+/g, " ").trim();
  const { title, sizes } = extractClothingSizes(name);
  name = title;
  name = name.replace(/\binoxidable\b/gi, "inoxydable");
  name = name.replace(/\bavec carton\b/gi, "");
  name = name.replace(/\s+\d{3,}$/g, "");
  if (/\b(sac|sandale|chaussure|escarpin|minaudi)/i.test(name)) {
    name = name.replace(ACCESSORY_LUXURY, "");
  }
  name = name.replace(/\bsexy\b/gi, "");
  name = name.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  name = name.replace(/\s+/g, " ").replace(/^[,.–-]+|[,.–-]+$/g, "").trim();
  const letters = name.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length > 3 && letters === letters.toUpperCase()) {
    name = name.toLowerCase().replace(/\bap\+/gi, "AP+");
  }
  name = applyBrandSpelling(name);
  name = name.replace(/\s+/g, " ").trim();
  if (/^sac$/i.test(name)) name = "Sac à main";
  if (/^sandales?$/i.test(name) || /^sandales? femmes?$/i.test(name)) name = "Sandale femme";
  if (!name) name = String(raw ?? "").trim() || "Produit NERA";
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return { name, sizes };
}

export function catalogDuplicateKey(name: string) {
  return slugify(cleanProductTitle(name).name);
}

/** Marques lues dans le nom seulement — jamais inventées. */
const BRAND_FROM_NAME: { pattern: RegExp; name: string }[] = [
  { pattern: /\bla roche[\s-]*posay\b/i, name: "La Roche-Posay" },
  { pattern: /\bcerave\b/i, name: "CeraVe" },
  { pattern: /\bnakae\b/i, name: "Nakae Beauté" },
  { pattern: /\bxuping\b/i, name: "Xuping" },
  { pattern: /\bstanle[yt]\b/i, name: "Stanley" },
  { pattern: /\bcolgate\b/i, name: "Colgate" },
  { pattern: /\blipikar\b|\blipakar\b/i, name: "Lipikar" },
  { pattern: /\beffaclar\b/i, name: "Effaclar" },
  { pattern: /\bnera\b/i, name: "NERA" },
];

export function inferBrandFromName(name: string): string | null {
  const hay = String(name ?? "");
  for (const token of BRAND_FROM_NAME) {
    if (token.pattern.test(hay)) return token.name;
  }
  return null;
}

export function gtinFromSkuOrBarcode(barcode?: string | null, sku?: string | null) {
  const fromBarcode = String(barcode ?? "").replace(/\D/g, "");
  if ([8, 12, 13, 14].includes(fromBarcode.length)) return fromBarcode;
  const fromSku = String(sku ?? "").replace(/\D/g, "");
  if ([8, 12, 13, 14].includes(fromSku.length)) return fromSku;
  return undefined;
}

export function uniquePublicTitle(
  name: string,
  extras?: { sku?: string | null; slug?: string | null; variantName?: string | null },
) {
  const cleaned = cleanProductTitle(name).name;
  const sku = extras?.sku?.trim();
  if (sku && !cleaned.toLowerCase().includes(sku.toLowerCase())) return `${cleaned} · ${sku}`;
  const variant = extras?.variantName?.trim();
  if (variant && variant.toLowerCase() !== cleaned.toLowerCase() && !cleaned.toLowerCase().includes(variant.toLowerCase())) {
    return `${cleaned} · ${variant}`;
  }
  const slug = extras?.slug?.trim();
  if (slug && slug !== slugify(cleaned)) return `${cleaned} · ${slug}`;
  return cleaned;
}

export function applyUniquePublicTitles<T extends { id: string; name: string; sku?: string | null; slug?: string }>(
  products: T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const product of products) {
    const key = catalogDuplicateKey(product.name);
    const list = groups.get(key) ?? [];
    list.push(product);
    groups.set(key, list);
  }
  const titles = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const product of group) {
      titles.set(product.id, uniquePublicTitle(product.name, { sku: product.sku, slug: product.slug }));
    }
  }
  return products.map((product) => (titles.has(product.id) ? { ...product, name: titles.get(product.id)! } : product));
}

export function neraProductSheet(name: string) {
  const title = cleanProductTitle(name).name;
  return {
    shortDescription: `${title} — NERA Beauté & Shop, Yaoundé.`,
    description: `${title} proposé par NERA Beauté & Shop, boutique au Marché Neptune Ahala, face Skymotors. Commandez en ligne ou passez en magasin. Livraison disponible.`,
  };
}

export function publishOnlineBlocker(input: {
  onlineVisible: boolean;
  photoCount: number;
  shortDescription?: string | null;
  description?: string | null;
}) {
  if (!input.onlineVisible) return null;
  if (input.photoCount < 1) return "Ajoutez au moins une photo avant de publier en boutique.";
  if (!String(input.shortDescription ?? "").trim() && !String(input.description ?? "").trim()) {
    return "Ajoutez une courte description avant de publier en boutique.";
  }
  return null;
}

export type HygieneVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
};

export type HygieneProduct = {
  id: string;
  name: string;
  slug?: string;
  sku?: string | null;
  brandId?: string | null;
  shortDescription: string | null;
  description: string | null;
  onlineVisible: boolean;
  isFeatured: boolean;
  photoCount: number;
  createdAt: Date | string;
  variants?: HygieneVariant[];
};

export type HygienePlan = {
  rename: { id: string; from: string; to: string }[];
  unpublish: { id: string; reason: string }[];
  merge: { fromId: string; toId: string }[];
  brands: { id: string; brandName: string }[];
  barcodes: { variantId: string; barcode: string }[];
  sheets: { id: string; shortDescription: string; description: string }[];
  feature: string[];
  sizeNotes: { id: string; note: string }[];
};

const FLAGSHIP_HINTS = [
  "mèche",
  "perruque",
  "parfum",
  "gloss",
  "lait corporel",
  "nakae",
  "caro",
  "lipikar",
  "cerave",
  "effaclar",
  "complément",
  "sac à main",
  "sandale",
  "boucles",
  "ceinture",
  "savon",
  "lingerie",
  "minaudi",
  "gourde",
];

function flagshipScore(name: string, photoCount: number, featured: boolean) {
  const hay = name.toLowerCase();
  const hint = FLAGSHIP_HINTS.findIndex((token) => hay.includes(token));
  return (featured ? 1000 : 0) + (hint >= 0 ? 80 - hint : 0) + Math.min(20, photoCount * 5);
}

function rankHygieneGroup<T extends { photoCount: number; isFeatured: boolean; createdAt: Date | string }>(group: T[]) {
  return [...group].sort((a, b) => {
    if (b.photoCount !== a.photoCount) return b.photoCount - a.photoCount;
    if (Number(b.isFeatured) !== Number(a.isFeatured)) return Number(b.isFeatured) - Number(a.isFeatured);
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function planCatalogHygiene(products: HygieneProduct[], flagshipCount = 20): HygienePlan {
  const rename: HygienePlan["rename"] = [];
  const unpublish: HygienePlan["unpublish"] = [];
  const merge: HygienePlan["merge"] = [];
  const brands: HygienePlan["brands"] = [];
  const barcodes: HygienePlan["barcodes"] = [];
  const sizeNotes: HygienePlan["sizeNotes"] = [];
  const cleaned = products.map((product) => {
    const { name, sizes } = cleanProductTitle(product.name);
    if (name !== product.name) rename.push({ id: product.id, from: product.name, to: name });
    if (sizes.length) {
      sizeNotes.push({ id: product.id, note: `Tailles : ${sizes.join(", ")}.` });
    }
    return { ...product, cleanedName: name, key: catalogDuplicateKey(product.name) };
  });

  const groups = new Map<string, typeof cleaned>();
  for (const product of cleaned) {
    const list = groups.get(product.key) ?? [];
    list.push(product);
    groups.set(product.key, list);
  }
  for (const group of groups.values()) {
    const ranked = rankHygieneGroup(group);
    for (const extra of ranked.slice(1)) {
      if (extra.onlineVisible) {
        merge.push({ fromId: extra.id, toId: ranked[0].id });
        unpublish.push({ id: extra.id, reason: `Doublon de « ${ranked[0].cleanedName} »` });
      }
    }
  }

  for (const product of cleaned) {
    if (product.onlineVisible && product.photoCount < 1 && !unpublish.some((row) => row.id === product.id)) {
      unpublish.push({ id: product.id, reason: "Fiche en ligne sans photo" });
    }
  }
  const unpublished = new Set(unpublish.map((row) => row.id));

  const survivors = cleaned.filter((product) => product.onlineVisible && !unpublished.has(product.id));
  const uniqueByKey = new Map<string, (typeof cleaned)[number]>();
  for (const product of survivors) {
    const current = uniqueByKey.get(product.key);
    if (!current || flagshipScore(product.cleanedName, product.photoCount, product.isFeatured) > flagshipScore(current.cleanedName, current.photoCount, current.isFeatured)) {
      uniqueByKey.set(product.key, product);
    }
  }
  const feature = [...uniqueByKey.values()]
    .sort(
      (a, b) =>
        flagshipScore(b.cleanedName, b.photoCount, b.isFeatured) -
        flagshipScore(a.cleanedName, a.photoCount, a.isFeatured),
    )
    .slice(0, flagshipCount)
    .map((product) => product.id);

  const sheets: HygienePlan["sheets"] = [];
  for (const product of cleaned) {
    if (!feature.includes(product.id)) continue;
    const sheet = neraProductSheet(product.cleanedName);
    const sizes = sizeNotes.find((row) => row.id === product.id)?.note;
    const short = product.shortDescription?.trim() || (sizes ? `${sheet.shortDescription} ${sizes}` : sheet.shortDescription);
    const long = product.description?.trim() || sheet.description;
    if (short !== (product.shortDescription ?? "") || long !== (product.description ?? "")) {
      sheets.push({ id: product.id, shortDescription: short, description: long });
    }
  }

  // Align with publishOnlineBlocker: photo alone is not enough.
  // Featured rows receive sheets above; other online empties must leave the boutique.
  const featuredIds = new Set(feature);
  for (const product of cleaned) {
    if (!product.onlineVisible || unpublished.has(product.id) || featuredIds.has(product.id)) continue;
    const hasText =
      Boolean(String(product.shortDescription ?? "").trim()) ||
      Boolean(String(product.description ?? "").trim());
    if (!hasText) {
      unpublish.push({ id: product.id, reason: "Fiche en ligne sans description" });
      unpublished.add(product.id);
    }
  }

  for (const product of cleaned) {
    if (unpublished.has(product.id) || product.brandId) continue;
    const brandName = inferBrandFromName(product.cleanedName) ?? inferBrandFromName(product.name);
    if (brandName) brands.push({ id: product.id, brandName });
  }

  const seenBarcodes = new Set<string>();
  for (const product of cleaned) {
    if (unpublished.has(product.id)) continue;
    for (const variant of product.variants ?? []) {
      if (variant.barcode?.trim()) {
        const existing = gtinFromSkuOrBarcode(variant.barcode);
        if (existing) seenBarcodes.add(existing);
        continue;
      }
      const gtin = gtinFromSkuOrBarcode(null, variant.sku) ?? gtinFromSkuOrBarcode(null, product.sku);
      if (!gtin || seenBarcodes.has(gtin)) continue;
      seenBarcodes.add(gtin);
      barcodes.push({ variantId: variant.id, barcode: gtin });
    }
  }

  return { rename, unpublish, merge, brands, barcodes, sheets, feature, sizeNotes };
}
