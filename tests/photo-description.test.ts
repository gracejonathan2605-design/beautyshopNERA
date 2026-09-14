import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { VISION_MAX_EDGE, IMAGE_MAX_EDGE } from "../src/lib/image-limits";
import {
  PHOTO_AI_UNAVAILABLE,
  PHOTO_DESCRIPTION_MODEL,
  PHOTO_SHORT_MAX,
  createAsyncLimiter,
  finalizePhotoDescriptionSuggestion,
  isPhotoDescriptionConfigError,
  mapPhotoAiError,
  parsePhotoDescriptionPayload,
  photoDescriptionInstructions,
  photoDescriptionUserPrompt,
  resolvePhotoDescriptionChoice,
  sanitizePhotoCopy,
} from "../src/lib/photo-description";

describe("suggestion de description photo", () => {
  it("n’invente pas de caractéristiques dans le prompt", () => {
    expect(photoDescriptionInstructions()).toMatch(/invente aucune/i);
    expect(photoDescriptionUserPrompt({ name: "Gloss", category: "Maquillage" })).toMatch(/Gloss/);
    expect(photoDescriptionUserPrompt({ name: "Gloss", category: "Maquillage" })).toMatch(/suis la photo/);
    expect(PHOTO_DESCRIPTION_MODEL).toMatch(/^google\/gemini-/);
  });

  it("nettoie et coupe sans dépasser la limite", () => {
    expect(sanitizePhotoCopy("  Gloss   **hydratant**  ", 40)).toBe("Gloss hydratant");
    expect(sanitizePhotoCopy("a".repeat(200), PHOTO_SHORT_MAX).length).toBeLessThanOrEqual(PHOTO_SHORT_MAX);
  });

  it("lit un JSON, y compris dans un bloc markdown", () => {
    expect(
      parsePhotoDescriptionPayload(
        '{"shortDescription":"Gloss hydratant rose.","description":"Gloss hydratant rose pour un éclat naturel."}',
      ),
    ).toEqual({
      shortDescription: "Gloss hydratant rose.",
      description: "Gloss hydratant rose pour un éclat naturel.",
    });
    expect(
      parsePhotoDescriptionPayload(
        "```json\n{\"shortDescription\":\"Sérum éclat.\",\"description\":\"Sérum éclat pour le visage.\"}\n```",
      )?.shortDescription,
    ).toBe("Sérum éclat.");
  });

  it("accepte un texte libre et refuse le vide", () => {
    expect(parsePhotoDescriptionPayload("Lait corporel karité.")).toEqual({
      shortDescription: "Lait corporel karité.",
      description: "Lait corporel karité.",
    });
    expect(parsePhotoDescriptionPayload("   ")).toBeNull();
    expect(finalizePhotoDescriptionSuggestion({ shortDescription: "", description: "" })).toBeNull();
  });

  it("n’écrit la suggestion que si on l’utilise", () => {
    expect(
      resolvePhotoDescriptionChoice({
        current: "Saisie manuelle",
        suggestion: "Texte IA",
        choice: "ignore",
      }),
    ).toBe("Saisie manuelle");
    expect(
      resolvePhotoDescriptionChoice({
        current: "Saisie manuelle",
        suggestion: "Texte IA modifié",
        choice: "use",
      }),
    ).toBe("Texte IA modifié");
  });

  it("repère une IA non configurée", () => {
    expect(isPhotoDescriptionConfigError(PHOTO_AI_UNAVAILABLE)).toBe(true);
    expect(mapPhotoAiError(new Error("Unauthorized: missing API key"))).toBe(PHOTO_AI_UNAVAILABLE);
    expect(isPhotoDescriptionConfigError("Photo trop lourde")).toBe(false);
  });

  it("limite la concurrence des analyses", async () => {
    const limit = createAsyncLimiter(2);
    let current = 0;
    let peak = 0;
    const jobs = Array.from({ length: 5 }, () =>
      limit(async () => {
        current += 1;
        peak = Math.max(peak, current);
        await new Promise((resolve) => setTimeout(resolve, 20));
        current -= 1;
      }),
    );
    await Promise.all(jobs);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("envoie une image plus petite que le catalogue pour l’analyse", () => {
    expect(VISION_MAX_EDGE).toBeLessThanOrEqual(IMAGE_MAX_EDGE);
    expect(VISION_MAX_EDGE).toBeGreaterThanOrEqual(512);
  });

  it("protège l’API de suggestion par une session staff", () => {
    const src = readFileSync("src/app/api/admin/photo-description/route.ts", "utf8");
    expect(src).toContain("getStaffSession");
    expect(src).toContain("products.create");
    expect(src).toContain("products.update");
  });
});
