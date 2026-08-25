const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.78;
const JPEG_QUALITY = 0.82;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function encodeCanvas(canvas: HTMLCanvasElement) {
  const webp = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webp && webp.size > 0) return { blob: webp, ext: "webp" as const, type: "image/webp" };
  const jpeg = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  if (jpeg && jpeg.size > 0) return { blob: jpeg, ext: "jpg" as const, type: "image/jpeg" };
  throw new Error("Compression impossible sur cet appareil.");
}

export async function compressImageFile(file: File): Promise<File> {
  if (!file.size) throw new Error("Fichier image vide.");
  if (!file.type.startsWith("image/")) throw new Error("Choisissez une photo (jpeg, png ou webp).");
  if (file.type === "image/webp" && file.size < 800_000) return file;
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Image illisible. Utilisez jpeg, png ou webp (pas HEIC).");
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Compression impossible sur cet appareil.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encoded = await encodeCanvas(canvas);
  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([encoded.blob], `${name}.${encoded.ext}`, { type: encoded.type });
}
