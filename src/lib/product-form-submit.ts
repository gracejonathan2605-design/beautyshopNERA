import type { ProductFormState } from "@/app/actions/admin";
import { compressImageFile } from "@/lib/client-compress";
import { ACTION_PAYLOAD_MAX_BYTES, VIDEO_CLIENT_MAX_BYTES } from "@/lib/product-media";

export function uploadActionError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (!message || /failed to fetch|networkerror|load failed|fetch/i.test(message)) {
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
