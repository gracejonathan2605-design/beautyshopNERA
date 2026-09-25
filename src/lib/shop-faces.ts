export const SHOP_TRUST_LINE =
  "Orange Money sans frais · Livraison 24h à Yaoundé · Retrait en magasin";

export const SHOP_HERO_LINE = "Mèches, soins et parfums choisis à Yaoundé";

export const MECHES_HREF = "/categorie/meches-perruques-extensions";

export const POUR_MOI = [
  {
    title: "Cheveux",
    href: MECHES_HREF,
    parents: ["meches-perruques-extensions", "soins-capillaires"],
  },
  {
    title: "Visage et maquillage",
    href: "/categorie/soins-du-visage",
    parents: ["soins-du-visage", "maquillage"],
  },
  {
    title: "Parfums et corps",
    href: "/categorie/parfumerie",
    parents: ["parfumerie", "cosmetiques-soins"],
  },
] as const;

/** Quartiers réellement livrés. Ce ne sont pas des avis inventés. */
export const YAOUNDE_PLACES = [
  { place: "Bastos", line: "Livraison à domicile, avec le même soin qu’en magasin." },
  { place: "Odza", line: "Commande en ligne, réception sous 24h à Yaoundé." },
  { place: "Ahala", line: "Retrait au Marché Neptune, face Skymotors." },
] as const;

export function rayonKey(category: { slug: string; parent?: { slug: string } | null } | null | undefined) {
  if (!category) return "";
  return category.parent?.slug || category.slug;
}

export function pickForParents<T extends { id: string; category?: { slug: string; parent?: { slug: string } | null } | null }>(
  products: T[],
  parents: readonly string[],
  take = 8,
) {
  const want = new Set(parents);
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const product of products) {
    if (!want.has(rayonKey(product.category))) continue;
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    picked.push(product);
    if (picked.length >= take) break;
  }
  return picked;
}

export function coverByRayon<
  T extends {
    name: string;
    category?: { slug: string; parent?: { slug: string } | null } | null;
    images?: { url: string; alt: string | null }[];
  },
>(products: T[]) {
  const covers = new Map<string, { src?: string; alt: string }>();
  for (const product of products) {
    const key = rayonKey(product.category);
    if (!key || covers.has(key)) continue;
    covers.set(key, { src: product.images?.[0]?.url, alt: product.images?.[0]?.alt || product.name });
  }
  return covers;
}
