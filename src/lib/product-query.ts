import { Prisma } from "@prisma/client";

export function isMissingFlashColumn(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2022" &&
    String(err.meta?.column ?? err.message).includes("flash")
  );
}

/** La boutique réserve uniquement au magasin par défaut — n’afficher que ce stock. */
export const shopInventoryWhere = {
  location: { isDefault: true },
} satisfies Prisma.InventoryWhereInput;

export const shopInventorySelect = {
  where: shopInventoryWhere,
  select: { onHand: true, reserved: true },
} as const;

export async function withFlashProductSelect<T>(
  run: (select: typeof productCardSelect) => Promise<T>,
): Promise<T> {
  try {
    return await run(productCardSelect);
  } catch (err) {
    if (!isMissingFlashColumn(err)) throw err;
    return run(productCardSelectWithoutFlash as typeof productCardSelect);
  }
}

export const productCardSelectWithoutFlash = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  isNew: true,
  isPromo: true,
  createdAt: true,
  status: true,
  onlineVisible: true,
  deletedAt: true,
  variants: {
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      salePrice: true,
      promoPrice: true,
      inventories: shopInventorySelect,
    },
  },
  images: {
    where: { kind: "IMAGE" },
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { url: true, alt: true },
  },
  sku: true,
} satisfies Prisma.ProductSelect;

export const productCardSelect = {
  ...productCardSelectWithoutFlash,
  flashStartAt: true,
  flashEndAt: true,
} satisfies Prisma.ProductSelect;

export const sellableOnlineWhere = {
  isActive: true,
  deletedAt: null,
  product: { status: "ACTIVE" as const, onlineVisible: true, deletedAt: null },
} satisfies Prisma.ProductVariantWhereInput;
