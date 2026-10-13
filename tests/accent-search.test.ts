import { describe, expect, it } from "vitest";
import { likePattern, productIdsMatching, unaccentAvailable, variantIdsMatching } from "../src/lib/accent-search";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("recherche sans accents", () => {
  it("échappe les jokers LIKE", () => {
    expect(likePattern("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");
    expect(likePattern("meche")).toBe("%meche%");
  });

  it.skipIf(!hasDatabase)("« meche » trouve « Mèche » à la caisse et dans l'admin", async () => {
    expect(await unaccentAvailable()).toBe(true);
    const variants = await variantIdsMatching("meche");
    expect(variants).not.toBeNull();
    expect(variants!.length).toBeGreaterThan(0);
    const products = await productIdsMatching("MECHE");
    expect(products!.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasDatabase)("un joker tapé par l'utilisateur ne renvoie pas tout le catalogue", async () => {
    const rows = await variantIdsMatching("%zzz-introuvable%");
    expect(rows).toEqual([]);
  });
});
