/** Anciens slugs encore en ligne → rayons officiels NERA_CATALOG. */
export const LEGACY_CATEGORY_REDIRECTS: Record<string, string> = {
  corps: "cosmetiques-soins",
  parfums: "parfumerie",
  meches: "meches-perruques-extensions",
  perruques: "meches-perruques-extensions",
  sacs: "mode",
  chaussures: "mode",
  bijoux: "accessoires-bijoux",
  accessoires: "accessoires-bijoux",
};

/** Intros uniques pour les rayons parents réels — pas de texte inventé sur le stock. */
export const PARENT_CATEGORY_INTROS: Record<string, string> = {
  "cosmetiques-soins":
    "Laits, beurres, huiles, savons et soins du corps chez NERA Beauté & Shop à Yaoundé. En magasin au Marché Neptune Ahala, face Skymotors, ou en ligne.",
  "soins-du-visage":
    "Nettoyants, crèmes, sérums et soins du visage chez NERA Beauté & Shop à Yaoundé. Commandez en ligne ou passez au Marché Neptune Ahala.",
  "meches-perruques-extensions":
    "Mèches, perruques, extensions et entretien chez NERA Beauté & Shop à Yaoundé. Boutique au Marché Neptune Ahala, face Skymotors.",
  "soins-capillaires":
    "Shampoings, masques, huiles et soins pour cheveux chez NERA Beauté & Shop à Yaoundé. Magasin et commande en ligne.",
  maquillage:
    "Fonds de teint, lèvres, yeux et accessoires de maquillage chez NERA Beauté & Shop à Yaoundé.",
  parfumerie:
    "Parfums, brumes et huiles parfumées chez NERA Beauté & Shop, boutique à Yaoundé au Marché Neptune Ahala.",
  homme: "Soins, parfums et essentiels pour homme chez NERA Beauté & Shop à Yaoundé.",
  "accessoires-bijoux":
    "Bijoux, montres et accessoires beauté chez NERA Beauté & Shop à Yaoundé.",
  mode: "Sacs, chaussures, sandales et lingerie chez NERA Beauté & Shop à Yaoundé.",
  "articles-divers":
    "Trousses, miroirs et petits accessoires de beauté chez NERA Beauté & Shop à Yaoundé.",
  "hygiene-buccale":
    "Dentifrice, brosses et hygiène buccale chez NERA Beauté & Shop à Yaoundé.",
  ongles: "Vernis, faux ongles et manucure chez NERA Beauté & Shop à Yaoundé.",
  "bien-etre": "Soins bien-être du quotidien chez NERA Beauté & Shop à Yaoundé.",
};

export function legacyCategoryDestination(slug: string) {
  return LEGACY_CATEGORY_REDIRECTS[slug] ?? null;
}

export function parentCategoryIntro(slug: string) {
  return PARENT_CATEGORY_INTROS[slug] ?? null;
}

export function categoryPageTitle(name: string, slug: string, isParent: boolean) {
  if (isParent && PARENT_CATEGORY_INTROS[slug] && !name.toLowerCase().includes("yaoundé")) {
    return `${name} à Yaoundé`;
  }
  return name;
}
