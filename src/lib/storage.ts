import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/env";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFor(file: File) {
  const fromType = file.type.split("/")[1]?.toLowerCase();
  if (fromType === "jpeg") return "jpg";
  if (fromType && ["jpg", "png", "webp", "gif"].includes(fromType)) return fromType;
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "jpeg") return "jpg";
  if (fromName && ["jpg", "png", "webp", "gif"].includes(fromName)) return fromName;
  return "jpg";
}

export async function uploadProductImage(file: File, productId: string) {
  if (!file.size) throw new Error("Fichier image vide");
  if (file.size > MAX_BYTES) throw new Error("Image trop lourde (max 5 Mo)");
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Format image non supporté (jpeg, png, webp, gif)");
  }

  const supabase = createSupabaseAdmin();
  const path = `${productId}/${Date.now()}.${extensionFor(file)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type || `image/${extensionFor(file)}`,
    upsert: false,
  });
  if (error) throw new Error(`Upload Storage: ${error.message}`);

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
