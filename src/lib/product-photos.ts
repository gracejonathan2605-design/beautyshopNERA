/** Photos locales pour le catalogue NERA — visibles même sans upload Supabase. */
export const PRODUCT_PHOTOS: Record<string, string> = {
  "meche-bresilienne-body-wave": "/products/hair-body-wave.jpg",
  "meche-bresilienne-straight": "/products/hair-straight.jpg",
  "perruque-naturelle-lace-front": "/products/wig-lace.jpg",
  "lait-corporel-hydratant": "/products/body-lotion.jpg",
  "parfum-femme-nera-or": "/products/perfume.jpg",
  "sac-a-main-cuir-camel": "/products/handbag.jpg",
  "sandale-femme": "/products/sandals.jpg",
  "boucles-doreilles-dorees": "/products/jewelry.jpg",
  "ceinture-femme-cuir": "/products/jewelry.jpg",
  "gloss-hydratant": "/products/gloss.jpg",
};

export function catalogPhotoFor(slug: string, name = "") {
  if (PRODUCT_PHOTOS[slug]) return PRODUCT_PHOTOS[slug];
  const hay = `${slug} ${name}`.toLowerCase();
  if (/(meche|perruque|extension|wig|cheveu)/.test(hay)) return "/products/hair-body-wave.jpg";
  if (/(parfum|perfume)/.test(hay)) return "/products/perfume.jpg";
  if (/(lait|creme|beurre|huile|soin|lotion)/.test(hay)) return "/products/body-lotion.jpg";
  if (/(sac|handbag)/.test(hay)) return "/products/handbag.jpg";
  if (/(sandale|chaussure|talon)/.test(hay)) return "/products/sandals.jpg";
  if (/(bijou|boucle|ceinture|accessoire)/.test(hay)) return "/products/jewelry.jpg";
  if (/(gloss|maquillage|lipstick)/.test(hay)) return "/products/gloss.jpg";
  return "/products/perfume.jpg";
}
