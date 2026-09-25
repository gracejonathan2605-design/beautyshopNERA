import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { slugify } from "@/lib/pricing";

async function saveAttribute(formData: FormData) {
  "use server";
  await requireStaff("attributes.manage");
  const name = String(formData.get("name") ?? "").trim();
  const values = String(formData.get("values") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!name || !values.length) return;
  const attribute = await prisma.attribute.upsert({
    where: { slug: slugify(name) || "attribut" },
    update: { name, isActive: true },
    create: { name, slug: slugify(name) || "attribut" },
  });
  for (const value of values) {
    const slug = slugify(value) || value.toLowerCase();
    await prisma.attributeValue.upsert({
      where: { attributeId_slug: { attributeId: attribute.id, slug } },
      update: { value },
      create: { attributeId: attribute.id, value, slug },
    });
  }
}

export default async function AttributesPage() {
  const session = await requireStaff("attributes.view");
  const canManage = hasPermission(session, "attributes.manage");
  const attributes = await prisma.attribute.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { values: { orderBy: { value: "asc" } } },
  });
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl">Teintes et tailles</h1>
      <p className="mt-2 text-sm text-black/60">
        Ces valeurs servent de repère quand vous nommez une variante produit (teinte 4, taille M).
      </p>
      <ul className="mt-6 space-y-3">
        {attributes.map((attribute) => (
          <li key={attribute.id} className="rounded-2xl bg-cream p-4">
            <p className="font-medium">{attribute.name}</p>
            <p className="mt-1 text-sm text-black/55">{attribute.values.map((value) => value.value).join(" · ") || "Aucune valeur"}</p>
          </li>
        ))}
      </ul>
      {canManage ? (
        <form action={saveAttribute} className="mt-8 grid gap-2">
          <input name="name" required placeholder="Nom (Teinte, Taille)" className="rounded-xl border px-3 py-2" />
          <input name="values" required placeholder="Valeurs séparées par des virgules" className="rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Enregistrer</button>
        </form>
      ) : null}
    </div>
  );
}
