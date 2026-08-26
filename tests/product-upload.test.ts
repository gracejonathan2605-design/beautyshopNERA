import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bulkDraftError, nameFromPhotoFile, uploadActionError, wrapProductAction } from "../src/lib/product-form-submit";
import { ACTION_PAYLOAD_MAX_BYTES, MAX_BULK_IMPORT, VIDEO_CLIENT_MAX_BYTES, VIDEO_MAX_BYTES, mediaIdsFromForm } from "../src/lib/product-media";
import { IMAGE_MAX_EDGE } from "../src/lib/image-limits";

describe("envoi photos / vidéos produit", () => {
  it("reste sous la limite Vercel (~4,5 Mo)", () => {
    expect(ACTION_PAYLOAD_MAX_BYTES).toBeLessThanOrEqual(4.5 * 1024 * 1024);
    expect(VIDEO_CLIENT_MAX_BYTES).toBeLessThan(ACTION_PAYLOAD_MAX_BYTES);
    expect(VIDEO_MAX_BYTES).toBe(VIDEO_CLIENT_MAX_BYTES);
  });

  it("traduit Failed to fetch en message photo trop lourde", () => {
    expect(uploadActionError(new Error("Failed to fetch"))).toMatch(/trop lourdes/);
    expect(uploadActionError(new Error("NetworkError when attempting to fetch resource."))).toMatch(/trop lourdes/);
    expect(uploadActionError(new Error("Load failed"))).toMatch(/trop lourdes/);
    expect(uploadActionError(new Error("Prix invalide"))).toBe("Prix invalide");
    expect(uploadActionError(new Error("Impossible de fetch le rayon"))).toBe("Impossible de fetch le rayon");
  });

  it("empêche l’erreur Failed to fetch de casser toute la page admin", async () => {
    const wrapped = wrapProductAction(async () => {
      throw new Error("Failed to fetch");
    });
    const result = await wrapped(null, new FormData());
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/trop lourdes/);
  });

  it("lit plusieurs identifiants de médias pour une suppression en masse", () => {
    const form = new FormData();
    form.append("mediaId", "a");
    form.append("mediaId", "b");
    form.append("mediaId", "a");
    form.append("mediaId", " ");
    expect(mediaIdsFromForm(form)).toEqual(["a", "b"]);
  });

  it("redimensionne les photos pour rester légères en boutique", () => {
    expect(IMAGE_MAX_EDGE).toBeLessThanOrEqual(1400);
  });

  it("ne publie pas d’identifiants de démo dans le README ni le seed", () => {
    const readme = readFileSync("README.md", "utf8");
    const seed = readFileSync("prisma/seed.ts", "utf8");
    for (const leaked of [
      "NeraAdmin2026",
      "Caisse2026",
      "Stock2026",
      "Client2026",
      "AdminOps2026",
      "Manager2026",
      "lqlfciaelhmaozxwunun",
      "raisaodin1@gmail.com",
    ]) {
      expect(readme).not.toContain(leaked);
      expect(seed).not.toContain(leaked);
    }
  });
});

describe("import en lot", () => {
  it("limite le nombre de photos et préremplit le nom depuis le fichier", () => {
    expect(MAX_BULK_IMPORT).toBeGreaterThanOrEqual(10);
    expect(MAX_BULK_IMPORT).toBeLessThanOrEqual(40);
    expect(nameFromPhotoFile(new File([], "lait-karite-nerá.jpg"))).toBe("lait karite nerá");
    expect(nameFromPhotoFile(new File([], "gloss.png"))).toBe("gloss");
  });

  it("exige nom, rayon et prix avant publication", () => {
    expect(bulkDraftError({ name: "", categoryId: "c1", salePrice: "5000" })).toMatch(/nom/);
    expect(bulkDraftError({ name: "Gloss", categoryId: "", salePrice: "5000" })).toMatch(/rayon/);
    expect(bulkDraftError({ name: "Gloss", categoryId: "c1", salePrice: "0" })).toMatch(/prix/);
    expect(bulkDraftError({ name: "Gloss", categoryId: "c1", salePrice: "3500" })).toBeNull();
  });
});
