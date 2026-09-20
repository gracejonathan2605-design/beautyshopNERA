/** Photos locales des fiches seed NERA — uniquement pour ces slugs exacts. */
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

export function catalogPhotoFor(slug: string, _name = "") {
  return PRODUCT_PHOTOS[slug] ?? null;
}

export function isCatalogFallbackPhoto(url?: string | null) {
  return Boolean(url?.startsWith("/products/"));
}

export function catalogPhotoAlt(name: string, url?: string | null, _category?: string | null) {
  if (!url) return name;
  if (isCatalogFallbackPhoto(url) && !Object.values(PRODUCT_PHOTOS).includes(url)) {
    return name;
  }
  return name;
}

export function shopProductImage(slug: string, uploaded?: string | null, name = "") {
  const real = uploaded?.trim();
  if (real) return real;
  return catalogPhotoFor(slug, name);
}
