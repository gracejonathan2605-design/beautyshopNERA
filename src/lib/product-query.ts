import type { Prisma } from "@prisma/client";

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  variants: {
    where: { isActive: true, deletedAt: null },
    take: 1,
    select: { salePrice: true, promoPrice: true },
  },
  images: {
    where: { kind: "IMAGE" },
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { url: true, alt: true },
  },
} satisfies Prisma.ProductSelect;

export const sellableOnlineWhere = {
  isActive: true,
  deletedAt: null,
  product: { status: "ACTIVE" as const, onlineVisible: true, deletedAt: null },
} satisfies Prisma.ProductVariantWhereInput;
