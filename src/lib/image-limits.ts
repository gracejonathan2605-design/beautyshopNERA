/** Taille max d’une photo catalogue (boutique + caisse). */
export const IMAGE_MAX_EDGE = 960;
/** Qualité WebP côté serveur (sharp, 1–100). */
export const IMAGE_WEBP_QUALITY = 64;
/** Qualité WebP / JPEG côté navigateur (0–1). */
export const IMAGE_CLIENT_QUALITY = 0.64;
/** Qualité next/image en boutique — 75 comme l’affichage d’origine. */
export const SHOP_IMAGE_QUALITY = 75;
/** 1 colonne sous 640 px (comme avant), puis 2 / 3 / 4. */
export const PRODUCT_CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw";
export const PRODUCT_GRID_CLASS = "grid gap-6 sm:grid-cols-2 md:grid-cols-3";
export const PRODUCT_GRID_HOME_CLASS = "grid gap-6 sm:grid-cols-2 md:grid-cols-4";
export const FLASH_CARD_SIZES = "(max-width: 768px) 80vw, 25vw";
