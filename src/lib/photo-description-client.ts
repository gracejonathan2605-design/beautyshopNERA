import { compressImageFile } from "@/lib/client-compress";
import {
  PHOTO_DESCRIPTION_CONCURRENCY,
  createAsyncLimiter,
  isPhotoDescriptionConfigError,
  type PhotoDescriptionResult,
} from "@/lib/photo-description";

const limit = createAsyncLimiter(PHOTO_DESCRIPTION_CONCURRENCY);
let cachedConfigError: string | null = null;

export async function requestPhotoDescriptionSuggestion(
  file: File,
  hints?: { name?: string; category?: string },
): Promise<PhotoDescriptionResult> {
  if (cachedConfigError) return { ok: false, error: cachedConfigError };
  return limit(async () => {
    if (cachedConfigError) return { ok: false, error: cachedConfigError };
    try {
      const photo = await compressImageFile(file);
      const fd = new FormData();
      fd.set("photo", photo);
      if (hints?.name?.trim()) fd.set("name", hints.name.trim());
      if (hints?.category?.trim()) fd.set("category", hints.category.trim());
      const res = await fetch("/api/admin/photo-description", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json()) as PhotoDescriptionResult;
      if (!data || typeof data !== "object" || !("ok" in data)) {
        return { ok: false, error: "Analyse impossible. Réessayez, ou saisissez la description à la main." };
      }
      if (!data.ok && isPhotoDescriptionConfigError(data.error)) {
        cachedConfigError = data.error;
      }
      return data;
    } catch {
      return { ok: false, error: "Analyse impossible. Vérifiez la connexion, puis réessayez." };
    }
  });
}
