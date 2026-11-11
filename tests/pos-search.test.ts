import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  categories: vi.fn(),
  variantIdsMatching: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productVariant: { findMany: mocks.findMany },
    category: { findMany: mocks.categories },
  },
}));
vi.mock("@/lib/guard", () => ({ requireStaff: vi.fn().mockResolvedValue({ userId: "cashier-1" }) }));
vi.mock("@/lib/accent-search", () => ({ variantIdsMatching: mocks.variantIdsMatching }));
vi.mock("@/services/cash.service", () => ({
  getOpenSessionForUser: vi.fn().mockResolvedValue({ register: { locationId: "shop-1" } }),
}));

import { browsePosProducts, searchPosProducts } from "../src/app/actions/pos";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.variantIdsMatching.mockResolvedValue([]);
});

describe("rayons de la caisse", () => {
  it("affiche les produits du rayon et de tous ses sous-rayons, avec une page suivante", async () => {
    mocks.categories.mockResolvedValue([
      { id: "parent", name: "Cheveux", parentId: null },
      { id: "child", name: "Mèches", parentId: "parent" },
      { id: "grandchild", name: "Extensions", parentId: "child" },
      { id: "other", name: "Visage", parentId: null },
    ]);
    mocks.findMany.mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => ({ id: String(i) })));
    const result = await browsePosProducts("parent", 1);
    expect(result.items).toHaveLength(24);
    expect(result.hasMore).toBe(true);
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where.product.categoryId.in).toEqual(["parent", "child", "grandchild"]);
    expect(query.where.product).not.toHaveProperty("onlineVisible");
    expect(query.skip).toBe(24);
    expect(query.take).toBe(25);
    expect(query.select.inventories.where.locationId).toBe("shop-1");
  });

  it("inclut les articles sans rayon dans tous les articles", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "sans-rayon" }]);
    const result = await browsePosProducts();
    expect(result).toEqual({ items: [{ id: "sans-rayon" }], hasMore: false });
    expect(mocks.findMany.mock.calls[0][0].where.product).not.toHaveProperty("categoryId");
    expect(mocks.categories).not.toHaveBeenCalled();
  });

  it("rejette un rayon inconnu et une page invalide", async () => {
    mocks.categories.mockResolvedValue([]);
    await expect(browsePosProducts("inconnu")).rejects.toThrow("Rayon introuvable");
    await expect(browsePosProducts(null, -1)).rejects.toThrow("Page de catalogue invalide");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("recherche des produits en caisse", () => {
  it("place les références et codes exacts avant les autres résultats", async () => {
    const exact = { id: "exact" };
    const other = { id: "other" };
    mocks.findMany.mockResolvedValueOnce([exact]).mockResolvedValueOnce([other]);
    await expect(searchPosProducts(" 123 ")).resolves.toEqual([exact, other]);
    expect(mocks.findMany.mock.calls[0][0].where.OR).toEqual([
      { sku: { equals: "123", mode: "insensitive" } },
      { barcode: { equals: "123" } },
    ]);
    const query = mocks.findMany.mock.calls[1][0];
    expect(query.where.id.notIn).toEqual(["exact"]);
    expect(query.where.OR).toContainEqual({ barcode: { contains: "123", mode: "insensitive" } });
    expect(query.where.OR).toContainEqual({ product: { sku: { contains: "123", mode: "insensitive" } } });
    expect(query.take).toBe(29);
    expect(query.select.images.take).toBe(1);
    expect(query.select.inventories.where.locationId).toBe("shop-1");
  });

  it("limite les résultats exacts à 30 sans requête supplémentaire", async () => {
    const matches = Array.from({ length: 30 }, (_, i) => ({ id: String(i) }));
    mocks.findMany.mockResolvedValueOnce(matches);
    await expect(searchPosProducts("123")).resolves.toEqual(matches);
    expect(mocks.findMany).toHaveBeenCalledOnce();
  });
});
