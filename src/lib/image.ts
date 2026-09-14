import sharp from "sharp";
import { IMAGE_MAX_EDGE, IMAGE_WEBP_QUALITY, VISION_MAX_EDGE } from "@/lib/image-limits";

async function toWebp(file: File, edge: number, quality: number) {
  if (!file.size) throw new Error("Fichier image vide");
  if (file.size > 12 * 1024 * 1024) throw new Error("Image trop lourde (max 12 Mo avant compression)");
  const input = Buffer.from(await file.arrayBuffer());
  try {
    return await sharp(input)
      .rotate()
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  } catch {
    throw new Error("Image illisible. Utilisez jpeg, png, webp, gif — les photos iPhone HEIC sont converties avant l’envoi.");
  }
}

export async function compressToWebp(file: File): Promise<Buffer> {
  return toWebp(file, IMAGE_MAX_EDGE, IMAGE_WEBP_QUALITY);
}

export async function compressForVision(file: File): Promise<{ buffer: Buffer; mediaType: "image/webp" }> {
  const buffer = await toWebp(file, VISION_MAX_EDGE, 72);
  return { buffer, mediaType: "image/webp" };
}
