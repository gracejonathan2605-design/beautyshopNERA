import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { AdminFlash } from "@/components/admin/flash";
import { hasPermission } from "@/lib/permissions";
import { PartnerBrandForm } from "@/components/admin/partner-brand-form";
import { PARTNERSHIP_TYPE_LABELS } from "@/lib/partner-brands";

export default async function PartnerBrandsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("brands.view");
  const { ok, erreur } = await searchParams;
  const canManage = hasPermission(session, "brands.manage");
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: [{ isPartner: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Marques partenaires</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        NERA reste la boutique. Chaque marque a sa page <code>/marques/…</code>. Le client achète dans le panier NERA.
        Logo, texte et collections se renseignent ici — sans inventer de contenu.
      </p>
      <AdminFlash ok={ok} erreur={erreur} />
      {canManage ? (
        <div className="mt-6">
          <h2 className="font-serif text-2xl text-wine">Ajouter une marque</h2>
          <PartnerBrandForm />
        </div>
      ) : null}
      <ul className="mt-8 space-y-2">
        {brands.map((brand) => (
          <li key={brand.id} className="rounded-2xl bg-cream p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-wine">
                  <Link href={`/admin/marques/${brand.id}`} className="underline">
                    {brand.name}
                  </Link>
                </p>
                <p className="text-sm text-black/50">
                  /marques/{brand.slug} · {brand._count.products} produit(s)
                  {brand.isPartner ? " · partenaire" : ""}
                  {brand.showOnSite && brand.isActive ? " · visible" : " · masquée"}
                  {brand.partnershipType !== "UNSET"
                    ? ` · ${PARTNERSHIP_TYPE_LABELS[brand.partnershipType]}`
                    : ""}
                </p>
              </div>
              <Link href={`/admin/marques/${brand.id}`} className="rounded-full border px-3 py-1 text-sm">
                Fiche
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
