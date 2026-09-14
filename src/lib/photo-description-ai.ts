import "server-only";

import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import {
  PHOTO_AI_UNAVAILABLE,
  PHOTO_DESCRIPTION_MODEL,
  finalizePhotoDescriptionSuggestion,
  mapPhotoAiError,
  parsePhotoDescriptionPayload,
  photoAiReady,
  photoDescriptionInstructions,
  photoDescriptionUserPrompt,
  type PhotoDescriptionDraft,
} from "@/lib/photo-description";

export const photoDescriptionSchema = z.object({
  shortDescription: z
    .string()
    .describe("Une phrase en français (80 à 160 caractères) décrivant uniquement ce qui est visible."),
  description: z
    .string()
    .describe(
      "Deux ou trois phrases pour la fiche produit. Uniquement ce qui est visible. Pas de prix ni d’ingrédients inventés.",
    ),
});

export async function generatePhotoDescriptionFromImage(input: {
  image: Buffer;
  mediaType: string;
  name?: string;
  category?: string;
}): Promise<PhotoDescriptionDraft> {
  if (!photoAiReady()) {
    throw new Error(PHOTO_AI_UNAVAILABLE);
  }

  const messages = [
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: photoDescriptionUserPrompt({ name: input.name, category: input.category }) },
        {
          type: "file" as const,
          mediaType: input.mediaType || "image/webp",
          data: input.image,
        },
      ],
    },
  ];

  try {
    const result = await generateText({
      model: PHOTO_DESCRIPTION_MODEL,
      instructions: photoDescriptionInstructions(),
      maxOutputTokens: 400,
      output: Output.object({
        schema: photoDescriptionSchema,
        name: "ProductDescription",
        description: "Description boutique à partir de la photo, sans inventer de caractéristiques.",
      }),
      messages,
    });
    const finalized = finalizePhotoDescriptionSuggestion(result.output);
    if (!finalized) throw new Error("empty description");
    return finalized;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      const parsed = parsePhotoDescriptionPayload(err.text);
      if (parsed) return parsed;
    }
    const mapped = mapPhotoAiError(err);
    if (mapped === PHOTO_AI_UNAVAILABLE) {
      throw new Error(mapped);
    }
    try {
      const fallback = await generateText({
        model: PHOTO_DESCRIPTION_MODEL,
        instructions: photoDescriptionInstructions(),
        maxOutputTokens: 400,
        messages,
      });
      const parsed = parsePhotoDescriptionPayload(fallback.text);
      if (parsed) return parsed;
    } catch (fallbackErr) {
      throw new Error(mapPhotoAiError(fallbackErr));
    }
    throw new Error(mapped);
  }
}
