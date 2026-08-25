import { describe, expect, it } from "vitest";
import { browseHref, paginateItems, parseBrowseQuery, SHOP_PAGE_SIZE, sortShopProducts } from "../src/lib/shop-browse";
import { productInStock, variantAvailable } from "../src/lib/stock-display";

describe("navigation boutique", () => {
  it("lit les filtres, le tri et la page", () => {
    expect(parseBrowseQuery({ q: " mèche ", vue: "promos", tri: "prix-asc", page: "2" })).toEqual({
      q: "mèche",
      rayon: "",
      vue: "promo",
      tri: "price-asc",
      page: 2,
    });
  });

  it("conserve les filtres dans l’URL de pagination", () => {
    const href = browseHref(
      "/boutique",
      { q: "parfum", rayon: "parfumerie", vue: "all", tri: "name", page: 1 },
      { page: 2 },
    );
    expect(href).toContain("/boutique?");
    expect(href).toContain("q=parfum");
    expect(href).toContain("page=2");
    expect(href).toContain("rayon=parfumerie");
  });

  it("trie par prix promo effectif puis pagine", () => {
    const products = [
      { name: "B", createdAt: new Date("2026-01-02"), variants: [{ salePrice: 8000, promoPrice: null }] },
      { name: "A", createdAt: new Date("2026-01-01"), variants: [{ salePrice: 10000, promoPrice: 4000 }] },
      { name: "C", createdAt: new Date("2026-01-03"), variants: [{ salePrice: 6000, promoPrice: null }] },
    ];
    const byPrice = sortShopProducts(products, "price-asc").map((p) => p.name);
    expect(byPrice).toEqual(["A", "C", "B"]);
    const page = paginateItems([1, 2, 3, 4, 5], 2, 2);
    expect(page).toEqual({ items: [3, 4], total: 5, page: 2, pages: 3 });
    expect(SHOP_PAGE_SIZE).toBe(24);
  });
});

describe("rupture de stock", () => {
  it("reste visible mais marqué indisponible", () => {
    expect(variantAvailable([])).toBe(0);
    expect(variantAvailable([{ onHand: 2, reserved: 2 }])).toBe(0);
    expect(variantAvailable([{ onHand: 4, reserved: 1 }])).toBe(3);
    expect(
      productInStock([
        { inventories: [{ onHand: 0, reserved: 0 }] },
        { inventories: [{ onHand: 1, reserved: 0 }] },
      ]),
    ).toBe(true);
    expect(productInStock([{ inventories: [{ onHand: 1, reserved: 1 }] }])).toBe(false);
  });
});
