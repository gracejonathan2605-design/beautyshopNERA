import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isAllowedProductImage } from "@/lib/product-images";
import { compressForVision } from "@/lib/image";
import { generatePhotoDescriptionFromImage } from "@/lib/photo-description-ai";
import {
  PHOTO_DESCRIPTION_MAX_BYTES,
  mapPhotoAiError,
  photoAiReady,
  PHOTO_AI_UNAVAILABLE,
} from "@/lib/photo-description";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Connectez-vous pour analyser la photo." }, { status: 401 });
    }
    if (!hasPermission(session, "products.create") && !hasPermission(session, "products.update")) {
      return NextResponse.json({ ok: false, error: "Permission refusée." }, { status: 403 });
    }
    if (!photoAiReady()) {
      return NextResponse.json({ ok: false, error: PHOTO_AI_UNAVAILABLE }, { status: 503 });
    }

    const formData = await request.formData();
    const photo = formData.get("photo");
    if (!(photo instanceof File) || !photo.size) {
      return NextResponse.json({ ok: false, error: "Ajoutez une photo à analyser." }, { status: 400 });
    }
    if (!isAllowedProductImage(photo)) {
      return NextResponse.json(
        { ok: false, error: "Format refusé. Jpeg, png, webp, gif ou HEIC (iPhone)." },
        { status: 400 },
      );
    }
    if (photo.size > PHOTO_DESCRIPTION_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Photo trop lourde pour l’analyse. Elle sera quand même envoyée à la publication." },
        { status: 400 },
      );
    }

    const { buffer, mediaType } = await compressForVision(photo);
    const draft = await generatePhotoDescriptionFromImage({
      image: buffer,
      mediaType,
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
    });
    return NextResponse.json({ ok: true, ...draft });
  } catch (err) {
    unstable_rethrow(err);
    return NextResponse.json({ ok: false, error: mapPhotoAiError(err) }, { status: 500 });
  }
}
