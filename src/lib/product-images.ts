export const PRODUCT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";

export function isHeicFile(file: { type?: string; name: string }) {
  const t = (file.type ?? "").toLowerCase();
  const n = file.name.toLowerCase();
  return t.includes("heic") || t.includes("heif") || n.endsWith(".heic") || n.endsWith(".heif");
}

export function isAllowedProductImage(file: { type?: string; name: string; size: number }) {
  if (!file.size) return false;
  if (file.type && /^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(file.type)) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}
