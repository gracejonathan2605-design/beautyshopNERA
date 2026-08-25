export const MAX_PRODUCT_PHOTOS = 5;
export const MAX_VIDEO_SECONDS = 40;
/** Limite réelle d’un Server Action sur Vercel (Hobby/Pro) : ~4,5 Mo. */
export const ACTION_PAYLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const VIDEO_CLIENT_MAX_BYTES = 3.5 * 1024 * 1024;
export const VIDEO_CLIENT_MAX_LABEL = "3,5 Mo";
/** Vercel coupe l’envoi bien avant 28 Mo : aligné sur la limite réelle. */
export const VIDEO_MAX_BYTES = VIDEO_CLIENT_MAX_BYTES;
/** Import en lot : une photo = un produit. Envoi un par un pour rester sous 4,5 Mo. */
export const MAX_BULK_IMPORT = 24;
