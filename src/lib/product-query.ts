import type { Prisma } from "@prisma/client";

export const productCardInclude = {
  variants: { where: { isActive: true, deletedAt: null }, take: 1 },
  images: { where: { kind: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.ProductInclude;
