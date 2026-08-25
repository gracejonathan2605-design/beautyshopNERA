import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/env";
import { compressToWebp } from "@/lib/image";
import { VIDEO_MAX_BYTES } from "@/lib/product-media";

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function publicUrl(path: string) {
  const supabase = createSupabaseAdmin();
  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadProductImage(file: File, productId: string, index = 0) {
  const webp = await compressToWebp(file);
  const supabase = createSupabaseAdmin();
  const path = `${productId}/img-${Date.now()}-${index}.webp`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, webp, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw new Error(`Upload photo : ${error.message}`);
  return publicUrl(path);
}

export async function uploadProductVideo(file: File, productId: string) {
  if (!file.size) throw new Error("Fichier vidéo vide");
  if (file.size > VIDEO_MAX_BYTES) throw new Error("Vidéo trop lourde (max 3,5 Mo / 40 s)");
  if (file.type && !VIDEO_TYPES.has(file.type)) {
    throw new Error("Format vidéo non supporté (mp4 ou webm)");
  }
  const supabase = createSupabaseAdmin();
  const ext = file.type === "video/webm" ? "webm" : "mp4";
  const path = `${productId}/video-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type || "video/mp4",
    upsert: false,
  });
  if (error) throw new Error(`Upload vidéo : ${error.message}`);
  return publicUrl(path);
}
