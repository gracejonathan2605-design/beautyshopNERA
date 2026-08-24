import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { installNeraCatalog } from "@/app/actions/admin";
import { CategoriesAdmin, type CategoryCard } from "@/components/admin/categories-admin";
import { hasPermission } from "@/lib/permissions";

export default async function CategoriesAdminPage() {
  const session = await requireStaff("categories.view");
  const categories = await prisma.category.findMany({
    where: { isActive: true, deletedAt: null },
    include: { _count: { select: { products: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const toCard = (c: (typeof categories)[number]): CategoryCard => ({
    id: c.id,
    name: c.name,
    productCount: c._count.products,
    childCount: c._count.children,
  });
  const roots = categories.filter((c) => !c.parentId).map(toCard);
  const childrenByParent: Record<string, CategoryCard[]> = {};
  for (const c of categories) {
    if (!c.parentId) continue;
    (childrenByParent[c.parentId] ??= []).push(toCard(c));
  }
  return (
    <div>
      <h1 className="font-serif text-4xl">Rayons</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Un <strong>rayon</strong> est une grande catégorie. Dans chaque rayon, ajoutez des{" "}
        <strong>sous-rayons</strong>. La suppression est verrouillée : il faut taper le nom exact, et un rayon qui
        contient encore des produits ou des sous-rayons ne peut pas être effacé.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={installNeraCatalog}>
          <button className="rounded-full border border-[#eee0e6] bg-white px-5 py-2 text-wine">
            Installer / mettre à jour le catalogue NERA
          </button>
        </form>
      </div>
      <CategoriesAdmin
        roots={roots}
        childrenByParent={childrenByParent}
        canCreate={hasPermission(session, "categories.create")}
        canUpdate={hasPermission(session, "categories.update")}
        canDelete={hasPermission(session, "categories.delete")}
      />
    </div>
  );
}
