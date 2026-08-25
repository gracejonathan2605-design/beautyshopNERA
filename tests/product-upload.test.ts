import { describe, expect, it } from "vitest";
import { uploadActionError, wrapProductAction } from "../src/lib/product-form-submit";
import { ACTION_PAYLOAD_MAX_BYTES, VIDEO_CLIENT_MAX_BYTES, VIDEO_MAX_BYTES } from "../src/lib/product-media";

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
  });

  it("empêche l’erreur Failed to fetch de casser toute la page admin", async () => {
    const wrapped = wrapProductAction(async () => {
      throw new Error("Failed to fetch");
    });
    const result = await wrapped(null, new FormData());
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/trop lourdes/);
  });
});
