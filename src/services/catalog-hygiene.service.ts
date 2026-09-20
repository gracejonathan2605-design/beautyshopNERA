import { prisma } from "@/lib/prisma";
import { planCatalogHygiene, type HygieneProduct } from "@/lib/catalog-hygiene";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/pricing";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-media";
import { normalizeBarcode } from "@/lib/barcode";

export async function applyCatalogHygiene(userId?: string) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      brandId: true,
      shortDescription: true,
      description: true,
      onlineVisible: true,
      isFeatured: true,
      createdAt: true,
      images: { where: { kind: "IMAGE" }, select: { id: true } },
      variants: {
        where: { deletedAt: null },
        select: { id: true, sku: true, barcode: true, name: true },
      },
    },
  });
  const rows: HygieneProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brandId: product.brandId,
    shortDescription: product.shortDescription,
    description: product.description,
    onlineVisible: product.onlineVisible,
    isFeatured: product.isFeatured,
    photoCount: product.images.length,
    createdAt: product.createdAt,
    variants: product.variants,
  }));
  const plan = planCatalogHygiene(rows, 20);
  const unpublished = new Set(plan.unpublish.map((row) => row.id));

  await prisma.$transaction(async (tx) => {
    for (const row of plan.merge) {
      await tx.productVariant.updateMany({
        where: { productId: row.fromId, deletedAt: null },
        data: { productId: row.toId, isDefault: false },
      });
      const keeperPhotos = await tx.productImage.count({
        where: { productId: row.toId, kind: "IMAGE" },
      });
      const extraMedia = await tx.productImage.findMany({
        where: { productId: row.fromId },
        orderBy: { sortOrder: "asc" },
      });
      let photoSlot = keeperPhotos;
      for (const media of extraMedia) {
        if (media.kind === "IMAGE" && photoSlot >= MAX_PRODUCT_PHOTOS) continue;
        await tx.productImage.update({
          where: { id: media.id },
          data: { productId: row.toId, sortOrder: media.kind === "IMAGE" ? photoSlot : media.sortOrder },
        });
        if (media.kind === "IMAGE") photoSlot += 1;
      }
    }
    for (const row of plan.rename) {
      await tx.product.update({ where: { id: row.id }, data: { name: row.to } });
    }
    for (const row of plan.unpublish) {
      await tx.product.update({
        where: { id: row.id },
        data: { onlineVisible: false },
      });
    }
    for (const row of plan.sheets) {
      await tx.product.update({
        where: { id: row.id },
        data: { shortDescription: row.shortDescription, description: row.description },
      });
    }
    if (plan.feature.length) {
      await tx.product.updateMany({
        where: { deletedAt: null, isFeatured: true, NOT: { id: { in: plan.feature } } },
        data: { isFeatured: false },
      });
      await tx.product.updateMany({
        where: { id: { in: plan.feature }, deletedAt: null },
        data: { isFeatured: true },
      });
    }
    const brandIds = new Map<string, string>();
    for (const row of plan.brands) {
      let brandId = brandIds.get(row.brandName);
      if (!brandId) {
        const slug = slugify(row.brandName) || "marque";
        const existing = await tx.brand.findFirst({
          where: { OR: [{ slug }, { name: row.brandName }] },
          select: { id: true },
        });
        if (existing) {
          await tx.brand.update({
            where: { id: existing.id },
            data: { name: row.brandName, isActive: true, deletedAt: null },
          });
          brandId = existing.id;
        } else {
          const created = await tx.brand.create({
            data: { name: row.brandName, slug, isActive: true },
            select: { id: true },
          });
          brandId = created.id;
        }
        brandIds.set(row.brandName, brandId);
      }
      await tx.product.update({ where: { id: row.id }, data: { brandId } });
    }
    const taken = new Set(
      (
        await tx.productVariant.findMany({
          where: { barcode: { not: null }, deletedAt: null },
          select: { barcode: true },
        })
      )
        .map((row) => normalizeBarcode(row.barcode))
        .filter(Boolean),
    );
    for (const row of plan.barcodes) {
      const code = normalizeBarcode(row.barcode);
      if (!code || taken.has(code)) continue;
      taken.add(code);
      await tx.productVariant.update({
        where: { id: row.variantId },
        data: { barcode: code },
      });
    }
    for (const row of plan.sizeNotes) {
      if (unpublished.has(row.id)) continue;
      const product = await tx.product.findUnique({
        where: { id: row.id },
        select: { shortDescription: true },
      });
      const current = product?.shortDescription?.trim() ?? "";
      if (current.includes("Tailles :")) continue;
      await tx.product.update({
        where: { id: row.id },
        data: { shortDescription: current ? `${current} ${row.note}` : row.note },
      });
    }
  });

  await writeAudit({
    userId,
    action: "CATALOG_HYGIENE",
    entity: "Product",
    after: {
      renamed: plan.rename.length,
      unpublished: plan.unpublish.length,
      merged: plan.merge.length,
      brands: plan.brands.length,
      barcodes: plan.barcodes.length,
      sheets: plan.sheets.length,
      featured: plan.feature.length,
    },
  });

  return {
    renamed: plan.rename.length,
    unpublished: plan.unpublish.length,
    merged: plan.merge.length,
    brands: plan.brands.length,
    barcodes: plan.barcodes.length,
    sheets: plan.sheets.length,
    featured: plan.feature.length,
  };
}
