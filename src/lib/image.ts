import sharp from "sharp";

const MAX_EDGE = 1600;
const WEBP_QUALITY = 78;

export async function compressToWebp(file: File): Promise<Buffer> {
  if (!file.size) throw new Error("Fichier image vide");
  if (file.size > 12 * 1024 * 1024) throw new Error("Image trop lourde (max 12 Mo avant compression)");
  const input = Buffer.from(await file.arrayBuffer());
  try {
    return await sharp(input)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw new Error("Image illisible. Utilisez jpeg, png, webp ou gif.");
  }
}
