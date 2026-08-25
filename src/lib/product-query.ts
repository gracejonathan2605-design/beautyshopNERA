import type { Prisma } from "@prisma/client";

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  isNew: true,
  isPromo: true,
  createdAt: true,
  variants: {
    where: { isActive: true, deletedAt: null },
    select: {
      salePrice: true,
      promoPrice: true,
      inventories: { select: { onHand: true, reserved: true } },
    },
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
