/** Taille max d’une photo catalogue (boutique + caisse). */
export const IMAGE_MAX_EDGE = 960;
/** Plus petite que le catalogue : assez pour l’analyse, moins de tokens. */
export const VISION_MAX_EDGE = 768;
/** Qualité WebP côté serveur (sharp, 1–100). */
export const IMAGE_WEBP_QUALITY = 64;
/** Qualité WebP / JPEG côté navigateur (0–1). */
export const IMAGE_CLIENT_QUALITY = 0.64;
/** Qualité next/image en boutique — 75 comme l’affichage d’origine. */
export const SHOP_IMAGE_QUALITY = 75;
/** 2 colonnes dès le téléphone : photos à 50vw, plus légères. */
export const PRODUCT_CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw";
export const PRODUCT_GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3";
export const PRODUCT_GRID_HOME_CLASS = "grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4";
export const FLASH_CARD_SIZES = "(max-width: 768px) 80vw, 25vw";
