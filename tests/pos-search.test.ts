import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  variantIdsMatching: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { productVariant: { findMany: mocks.findMany } } }));
vi.mock("@/lib/guard", () => ({ requireStaff: vi.fn().mockResolvedValue({ userId: "cashier-1" }) }));
vi.mock("@/lib/accent-search", () => ({ variantIdsMatching: mocks.variantIdsMatching }));
vi.mock("@/services/cash.service", () => ({
  getOpenSessionForUser: vi.fn().mockResolvedValue({ register: { locationId: "shop-1" } }),
}));

import { searchPosProducts } from "../src/app/actions/pos";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.variantIdsMatching.mockResolvedValue([]);
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
