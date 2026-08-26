import { PRODUCT_IMAGE_ACCEPT, isAllowedProductImage } from "./product-images";

export { PRODUCT_IMAGE_ACCEPT };

export const MAX_BULK_PRODUCTS = 15;
/** Photos trop lourdes (avant compression) : on refuse pour ne pas bloquer le navigateur. */
export const MAX_BULK_SOURCE_BYTES = 20 * 1024 * 1024;

export const BULK_IMAGE_ACCEPT = PRODUCT_IMAGE_ACCEPT;

export function isAllowedBulkImage(file: { type?: string; name: string; size: number }) {
  return isAllowedProductImage(file);
}

export function bulkImageRejection(file: { type?: string; name: string; size: number }) {
  if (!file.size) return "Fichier vide.";
  if (file.size > MAX_BULK_SOURCE_BYTES) return "Photo trop lourde (max 20 Mo). Compressez-la ou choisissez-en une autre.";
  if (!isAllowedBulkImage(file)) return "Format refusé. Jpeg, png, webp, gif ou HEIC (iPhone).";
  return null;
}

export function suggestNameFromFile(fileName: string) {
  const raw = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export type BulkDraftInput = {
  name: string;
  categoryId: string;
  salePrice: string;
};

export function bulkDraftIssues(row: BulkDraftInput) {
  const issues: string[] = [];
  if (!row.name.trim()) issues.push("Nom manquant");
  if (!row.categoryId.trim()) issues.push("Catégorie manquante");
  const price = Number(String(row.salePrice).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(price) || Math.round(price) <= 0) issues.push("Prix manquant");
  return issues;
}
