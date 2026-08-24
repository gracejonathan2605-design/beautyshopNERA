import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { saveCategory, installNeraCatalog } from "@/app/actions/admin";

export default async function CategoriesAdminPage() {
  await requireStaff("categories.view");
  const categories = await prisma.category.findMany({
    where: { isActive: true, deletedAt: null },
    include: { parent: true, _count: { select: { products: true, children: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const roots = categories.filter((c) => !c.parentId);
  return (
    <div>
      <h1 className="font-serif text-4xl">Catégories</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Le catalogue NERA est déjà prévu. Cliquez sur « Installer le catalogue » pour créer tous les rayons
        et sous-rayons. Ensuite, à la création d’un produit, il suffit de choisir la catégorie.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={installNeraCatalog}>
          <button className="rounded-full bg-brown px-5 py-2 text-cream">Installer / mettre à jour le catalogue NERA</button>
        </form>
      </div>
      <form action={saveCategory} className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-cream p-5">
        <input name="name" required placeholder="Nom (rayon ou sous-rayon)" className="rounded-xl border px-3 py-2" />
        <select name="parentId" className="rounded-xl border px-3 py-2">
          <option value="">Nouveau rayon (racine)</option>
          {roots.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="rounded-full bg-brown px-5 py-2 text-cream">Ajouter</button>
      </form>
      <div className="mt-8 space-y-6">
        {roots.map((root) => {
          const children = categories.filter((c) => c.parentId === root.id);
          return (
            <section key={root.id} className="rounded-2xl bg-cream p-5">
              <h2 className="font-serif text-2xl">
                {root.name}{" "}
                <span className="text-sm font-sans text-black/40">
                  {root._count.products} produit(s) · {children.length} sous-rayons
                </span>
              </h2>
              <ul className="mt-3 columns-1 gap-2 sm:columns-2 md:columns-3">
                {children.map((c) => (
                  <li key={c.id} className="break-inside-avoid py-1 text-sm">
                    {c.name}
                    {c._count.products ? <span className="text-black/40"> · {c._count.products}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
