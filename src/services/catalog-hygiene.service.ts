import { prisma } from "@/lib/prisma";
import { planCatalogHygiene, type HygieneProduct } from "@/lib/catalog-hygiene";
import { writeAudit } from "@/lib/audit";

export async function applyCatalogHygiene(userId?: string) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      shortDescription: true,
      description: true,
      onlineVisible: true,
      isFeatured: true,
      createdAt: true,
      images: { where: { kind: "IMAGE" }, select: { id: true } },
    },
  });
  const rows: HygieneProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    onlineVisible: product.onlineVisible,
    isFeatured: product.isFeatured,
    photoCount: product.images.length,
    createdAt: product.createdAt,
  }));
  const plan = planCatalogHygiene(rows, 20);
  const unpublished = new Set(plan.unpublish.map((row) => row.id));

  await prisma.$transaction(async (tx) => {
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
      sheets: plan.sheets.length,
      featured: plan.feature.length,
    },
  });

  return {
    renamed: plan.rename.length,
    unpublished: plan.unpublish.length,
    sheets: plan.sheets.length,
    featured: plan.feature.length,
  };
}
