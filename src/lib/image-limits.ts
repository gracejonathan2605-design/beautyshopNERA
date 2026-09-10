/** Taille max d’une photo catalogue (boutique + caisse). */
export const IMAGE_MAX_EDGE = 960;
/** Qualité WebP côté serveur (sharp, 1–100). */
export const IMAGE_WEBP_QUALITY = 64;
/** Qualité WebP / JPEG côté navigateur (0–1). */
export const IMAGE_CLIENT_QUALITY = 0.64;
/** Qualité next/image sur les photos boutique. */
export const SHOP_IMAGE_QUALITY = 64;
/** Grille mobile 2 colonnes : environ 50 vw par photo. */
export const PRODUCT_CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";
export const PRODUCT_GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3";
export const PRODUCT_GRID_HOME_CLASS = "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4";
