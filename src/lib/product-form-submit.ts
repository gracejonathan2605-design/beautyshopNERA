import type { ProductFormState } from "@/app/actions/admin";
import { compressImageFile } from "@/lib/client-compress";
import { ACTION_PAYLOAD_MAX_BYTES, VIDEO_CLIENT_MAX_BYTES } from "@/lib/product-media";
import { unstable_rethrow } from "next/navigation";

export function uploadActionError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (!message || /failed to fetch|networkerror|load failed/i.test(message)) {
    return "L’envoi du fichier a été coupé. Les photos du téléphone sont souvent trop lourdes. Essayez 1 photo, sans vidéo.";
  }
  return message;
}

export function wrapProductAction(
  action: (prev: ProductFormState | null, data: FormData) => Promise<ProductFormState>,
) {
  return async (prev: ProductFormState | null, data: FormData): Promise<ProductFormState> => {
    try {
      return await action(prev, data);
    } catch (err) {
      unstable_rethrow(err);
      return { ok: false, error: uploadActionError(err) };
    }
  };
}

export async function prepareProductFormData(form: HTMLFormElement) {
  const fd = new FormData(form);
  const photos = fd.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  fd.delete("photos");
  for (const photo of photos) {
    fd.append("photos", await compressImageFile(photo));
  }
  const video = fd.get("video");
  if (video instanceof File && video.size > VIDEO_CLIENT_MAX_BYTES) {
    throw new Error("La vidéo est trop lourde (max 3,5 Mo). Publiez d’abord le produit, puis ajoutez une vidéo plus légère.");
  }
  let total = 0;
  for (const value of fd.values()) {
    if (value instanceof File) total += value.size;
  }
  if (total > ACTION_PAYLOAD_MAX_BYTES) {
    throw new Error("Les fichiers dépassent la taille d’envoi. Envoyez une ou deux photos, sans vidéo.");
  }
  return fd;
}

export function nameFromPhotoFile(file: File) {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base || "Produit";
}

export async function buildBulkProductFormData(input: {
  name: string;
  categoryId: string;
  salePrice: string;
  shortDescription: string;
  stock: string;
  brandId?: string;
  supplierId?: string;
  onlineVisible: boolean;
  isNew: boolean;
  photo: File;
}) {
  const fd = new FormData();
  fd.set("name", input.name.trim());
  fd.set("categoryId", input.categoryId);
  fd.set("salePrice", input.salePrice.trim());
  fd.set("shortDescription", input.shortDescription.trim());
  fd.set("stock", input.stock.trim());
  if (input.brandId) fd.set("brandId", input.brandId);
  if (input.supplierId) fd.set("supplierId", input.supplierId);
  if (input.onlineVisible) fd.set("onlineVisible", "on");
  if (input.isNew) fd.set("isNew", "on");
  const photo = await compressImageFile(input.photo);
  if (photo.size > ACTION_PAYLOAD_MAX_BYTES) {
    throw new Error("La photo reste trop lourde après compression. Essayez une autre image.");
  }
  fd.append("photos", photo);
  return fd;
}

export function bulkDraftError(row: {
  name: string;
  categoryId: string;
  salePrice: string;
}) {
  if (!row.name.trim()) return "Indiquez le nom.";
  if (!row.categoryId.trim()) return "Choisissez un rayon.";
  const price = Number(String(row.salePrice).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) return "Indiquez un prix en FCFA.";
  return null;
}
