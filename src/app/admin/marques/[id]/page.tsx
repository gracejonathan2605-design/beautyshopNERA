import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { AdminFlash } from "@/components/admin/flash";
import { hasPermission } from "@/lib/permissions";
import { PartnerBrandForm } from "@/components/admin/partner-brand-form";
import { deleteBrandCollection, deletePartnerBrand, saveBrandCollection } from "@/app/actions/partner-brands";
import { COLLECTION_KIND_LABELS, PARTNERSHIP_TYPE_LABELS } from "@/lib/partner-brands";

export default async function PartnerBrandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("brands.view");
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const canManage = hasPermission(session, "brands.manage");
  const [brand, categories] = await Promise.all([
    prisma.brand.findFirst({
      where: { id, deletedAt: null },
      include: {
        collections: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: { products: { select: { productId: true } }, _count: { select: { products: true } } },
        },
        products: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true, onlineVisible: true, stockOwner: true },
        },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!brand) notFound();

  return (
    <div className="max-w-3xl">
      <p className="text-sm">
        <Link href="/admin/marques" className="underline">
          ← Marques partenaires
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">{brand.name}</h1>
      <p className="mt-2 text-sm text-black/50">
        Page publique :{" "}
        <Link href={`/marques/${brand.slug}`} className="underline">
          /marques/{brand.slug}
        </Link>
        {brand.partnershipType !== "UNSET" ? ` · ${PARTNERSHIP_TYPE_LABELS[brand.partnershipType]}` : ""}
      </p>
      <AdminFlash ok={ok} erreur={erreur} />
      {canManage ? <div className="mt-6"><PartnerBrandForm brand={brand} /></div> : null}
      {canManage ? (
        <form action={deletePartnerBrand} className="mt-4">
          <input type="hidden" name="id" value={brand.id} />
          <button className="text-sm text-red-700 underline">Retirer la marque du site</button>
        </form>
      ) : null}

      <h2 className="mt-10 font-serif text-2xl">Produits liés</h2>
      <p className="mt-1 text-sm text-black/50">
        Associez un produit à cette marque depuis la fiche produit (champ Marque). Stock NERA / partenaire : visible ici seulement.
      </p>
      {brand.products.length ? (
        <ul className="mt-4 space-y-2">
          {brand.products.map((product) => (
            <li key={product.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
              <Link href={`/admin/produits/${product.id}`} className="underline">
                {product.name}
              </Link>
              <span className="ml-2 text-black/45">
                {product.onlineVisible ? "en ligne" : "hors ligne"} · {product.stockOwner === "PARTNER" ? "stock partenaire" : "stock NERA"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-black/50">Aucun produit associé pour le moment.</p>
      )}

      <h2 className="mt-10 font-serif text-2xl">Collections</h2>
      <p className="mt-1 text-sm text-black/50">
        Créées ici, pas dans le code. Le client les voit comme des filtres sur la page marque.
      </p>
      {brand.collections.map((collection) => (
        <article key={collection.id} className="mt-4 rounded-2xl bg-cream p-4">
          {canManage ? (
            <form action={saveBrandCollection} className="grid gap-2 md:grid-cols-2">
              <input type="hidden" name="id" value={collection.id} />
              <input type="hidden" name="brandId" value={brand.id} />
              <input name="name" defaultValue={collection.name} className="rounded-lg border px-2 py-1" />
              <input name="slug" defaultValue={collection.slug} className="rounded-lg border px-2 py-1" />
              <select name="kind" defaultValue={collection.kind} className="rounded-lg border px-2 py-1">
                {Object.entries(COLLECTION_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select name="categoryId" defaultValue={collection.categoryId ?? ""} className="rounded-lg border px-2 py-1">
                <option value="">Rayon (si type rayon)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input name="sortOrder" type="number" defaultValue={collection.sortOrder} className="rounded-lg border px-2 py-1" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={collection.isActive} /> Active
              </label>
              {collection.kind === "MANUAL" ? (
                <fieldset className="md:col-span-2">
                  <legend className="text-xs text-black/45">Produits de la sélection</legend>
                  <div className="mt-2 grid gap-1">
                    {brand.products.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="productId"
                          value={product.id}
                          defaultChecked={collection.products.some((row) => row.productId === product.id)}
                        />
                        {product.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">OK</button>
            </form>
          ) : (
            <p>
              {collection.name} · {COLLECTION_KIND_LABELS[collection.kind]} · {collection._count.products} produit(s)
            </p>
          )}
          {canManage ? (
            <form action={deleteBrandCollection} className="mt-2">
              <input type="hidden" name="id" value={collection.id} />
              <input type="hidden" name="brandId" value={brand.id} />
              <button className="text-xs text-red-700 underline">Supprimer la collection</button>
            </form>
          ) : null}
        </article>
      ))}
      {canManage ? (
        <form action={saveBrandCollection} className="mt-6 grid gap-2 rounded-2xl border border-dashed border-[#eee0e6] p-4 md:grid-cols-2">
          <input type="hidden" name="brandId" value={brand.id} />
          <input name="name" required placeholder="Nom de la collection" className="rounded-lg border px-2 py-1" />
          <select name="kind" defaultValue="MANUAL" className="rounded-lg border px-2 py-1">
            {Object.entries(COLLECTION_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select name="categoryId" className="rounded-lg border px-2 py-1">
            <option value="">Rayon (si besoin)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input name="sortOrder" type="number" defaultValue={brand.collections.length + 1} className="rounded-lg border px-2 py-1" />
          <button className="rounded-full bg-brown px-3 py-2 text-sm text-cream md:col-span-2">Créer la collection</button>
        </form>
      ) : null}
    </div>
  );
}
