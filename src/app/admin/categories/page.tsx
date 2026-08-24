import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { saveCategory } from "@/app/actions/admin";

export default async function CategoriesAdminPage() {
  await requireStaff("categories.view");
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { parent: true },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Catégories</h1>
      <form action={saveCategory} className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-cream p-5">
        <input name="name" required placeholder="Nom" className="rounded-xl border px-3 py-2" />
        <select name="parentId" className="rounded-xl border px-3 py-2">
          <option value="">Racine</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="rounded-full bg-brown px-5 py-2 text-cream">Ajouter</button>
      </form>
      <ul className="mt-6 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="rounded-xl bg-cream px-4 py-3">
            {c.parent ? `${c.parent.name} / ` : ""}{c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
