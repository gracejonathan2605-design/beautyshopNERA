import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productCardSelect } from "@/lib/product-query";
import { applyUniquePublicTitles } from "@/lib/catalog-hygiene";
import type { CollectionKindCode } from "@/lib/partner-brands";

const publicBrandWhere = {
  isPartner: true,
  showOnSite: true,
  isActive: true,
  deletedAt: null,
} satisfies Prisma.BrandWhereInput;

const onlineProductWhere = {
  status: "ACTIVE" as const,
  onlineVisible: true,
  deletedAt: null,
};

export const publicPartnerBrandSelect = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  banner: true,
  description: true,
  sortOrder: true,
  updatedAt: true,
} as const;

export async function listPublicPartnerBrands() {
  return prisma.brand.findMany({
    where: publicBrandWhere,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: publicPartnerBrandSelect,
  });
}

export async function getPublicPartnerBrand(slug: string) {
  const brand = await prisma.brand.findFirst({
    where: { slug, ...publicBrandWhere },
    select: {
      ...publicPartnerBrandSelect,
      collections: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          kind: true,
          categoryId: true,
        },
      },
    },
  });
  return brand;
}

export async function listBrandOnlineProducts(brandId: string, take = 48) {
  const rows = await prisma.product.findMany({
    where: { brandId, ...onlineProductWhere },
    select: productCardSelect,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take,
  });
  return applyUniquePublicTitles(rows);
}

export async function listBrandNewProducts(brandId: string, take = 8) {
  const rows = await prisma.product.findMany({
    where: { brandId, isNew: true, ...onlineProductWhere },
    select: productCardSelect,
    orderBy: { createdAt: "desc" },
    take,
  });
  return applyUniquePublicTitles(rows);
}

export async function listBrandFeaturedProducts(brandId: string, take = 8) {
  const rows = await prisma.product.findMany({
    where: { brandId, isFeatured: true, ...onlineProductWhere },
    select: productCardSelect,
    orderBy: { updatedAt: "desc" },
    take,
  });
  return applyUniquePublicTitles(rows);
}

export async function listBrandBestsellers(brandId: string, take = 8) {
  const [pos, online] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ["variantId"],
      where: {
        sale: { status: "COMPLETED" },
        variant: { product: { brandId, ...onlineProductWhere } },
      },
      _sum: { quantity: true },
    }),
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        order: { status: { in: ["SHIPPED", "DELIVERED"] } },
        variant: { product: { brandId, ...onlineProductWhere } },
      },
      _sum: { quantity: true },
    }),
  ]);
  const qty = new Map<string, number>();
  for (const row of [...pos, ...online]) {
    qty.set(row.variantId, (qty.get(row.variantId) ?? 0) + (row._sum.quantity ?? 0));
  }
  if (!qty.size) return [];
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...qty.keys()] } },
    select: { id: true, productId: true },
  });
  const byProduct = new Map<string, number>();
  for (const variant of variants) {
    byProduct.set(variant.productId, (byProduct.get(variant.productId) ?? 0) + (qty.get(variant.id) ?? 0));
  }
  const ranked = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
  if (!ranked.length) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ranked.map(([id]) => id) }, ...onlineProductWhere },
    select: productCardSelect,
  });
  const order = new Map(ranked.map(([id], index) => [id, index]));
  rows.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  return applyUniquePublicTitles(rows);
}

export async function productsForCollection(input: {
  brandId: string;
  kind: CollectionKindCode;
  categoryId?: string | null;
  collectionId: string;
  take?: number;
}) {
  const take = input.take ?? 48;
  if (input.kind === "NEW") return listBrandNewProducts(input.brandId, take);
  if (input.kind === "FEATURED") return listBrandFeaturedProducts(input.brandId, take);
  if (input.kind === "BESTSELLERS") return listBrandBestsellers(input.brandId, take);
  if (input.kind === "CATEGORY" && input.categoryId) {
    const rows = await prisma.product.findMany({
      where: { brandId: input.brandId, categoryId: input.categoryId, ...onlineProductWhere },
      select: productCardSelect,
      orderBy: { createdAt: "desc" },
      take,
    });
    return applyUniquePublicTitles(rows);
  }
  if (input.kind === "MANUAL") {
    const links = await prisma.brandCollectionProduct.findMany({
      where: { collectionId: input.collectionId },
      orderBy: { sortOrder: "asc" },
      select: { productId: true },
    });
    if (!links.length) return [];
    const rows = await prisma.product.findMany({
      where: { id: { in: links.map((row) => row.productId) }, brandId: input.brandId, ...onlineProductWhere },
      select: productCardSelect,
    });
    const order = new Map(links.map((row, index) => [row.productId, index]));
    rows.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
    return applyUniquePublicTitles(rows);
  }
  return listBrandOnlineProducts(input.brandId, take);
}
