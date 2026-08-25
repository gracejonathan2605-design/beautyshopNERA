import { Prisma } from "@prisma/client";

export function isMissingFlashColumn(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2022" &&
    String(err.meta?.column ?? err.message).includes("flash")
  );
}

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
