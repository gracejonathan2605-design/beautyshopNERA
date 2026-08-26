import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { BulkProductImport } from "@/components/admin/bulk-product-import";
import { groupCategoriesForSelect } from "@/lib/catalog";

export default async function BulkProductsPage() {
  await requireStaff("products.create");
  const [categories, brands, suppliers] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/produits" className="text-brown underline">
          ← Produits
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">Import en lot</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Importez plusieurs photos, complétez nom / rayon / prix sur chaque fiche, puis publiez tout d’un coup. Un produit
        par photo. Le SKU est automatique. Visible ensuite en boutique et à la caisse.
      </p>
      <div className="mt-6">
        <BulkProductImport
          categoryGroups={groupCategoriesForSelect(categories)}
          brands={brands}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}
