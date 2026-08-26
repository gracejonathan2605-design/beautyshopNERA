import { BulkProductPublisher } from "@/components/admin/bulk-product-publisher";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { groupCategoriesForSelect } from "@/lib/catalog";
import Link from "next/link";

export default async function BulkProductsPage() {
  await requireStaff("products.create");
  const [categories, brands, suppliers] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <p className="text-sm text-black/50">
        <Link href="/admin/produits" className="underline">
          ← Produits
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-4xl">Publier un lot</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Sélectionnez jusqu’à 15 photos : chaque image devient un produit indépendant. Remplissez les
        fiches sur cette page, puis publiez tout d’un coup. Un échec n’annule pas les autres.
        Photos compressées automatiquement (comme à la création d’un seul produit).
      </p>
      <div className="mt-6">
        <BulkProductPublisher
          categoryGroups={groupCategoriesForSelect(categories)}
          brands={brands}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}
