import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { BulkProductPublisher } from "@/components/admin/bulk-product-publisher";
import { groupCategoriesForSelect } from "@/lib/catalog";

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
      <p className="text-sm">
        <Link href="/admin/produits" className="text-brown underline">
          ← Produits
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">Publier un lot</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Téléphone ou ordinateur : jusqu’à 15 photos, chaque image devient un produit. Après chaque photo, une suggestion de description apparaît : utilisez-la (vous pourrez encore la modifier), ou ignorez-la. Même fiche
        (nom, rayon, prix, description) et mêmes traitements (HEIC iPhone, compression WebP 960 px).
        Sur mobile, ouvrez la galerie et sélectionnez plusieurs photos d’un coup. Un échec n’annule
        pas les autres. Visible ensuite en boutique et à la caisse.
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
