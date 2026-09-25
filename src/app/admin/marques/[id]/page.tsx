import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { AdminFlash } from "@/components/admin/flash";
import { hasPermission } from "@/lib/permissions";
import { PartnerBrandForm } from "@/components/admin/partner-brand-form";
import { deleteBrandCollection, deletePartnerBrand, markSettlementPaid, recordBrandSettlement, saveBrandCollection, saveBrandIntake, saveBrandTerms } from "@/app/actions/partner-brands";
import { COLLECTION_KIND_LABELS, PARTNERSHIP_TYPE_LABELS } from "@/lib/partner-brands";
import { settlementRuleLabel } from "@/lib/partner-settlement";
import { previewBrandSettlement } from "@/services/partner-settlement.service";
import { formatCfa } from "@/lib/money";
import { groupCategoriesForSelect } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/product-form";

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
          select: {
            id: true,
            name: true,
            onlineVisible: true,
            stockOwner: true,
            variants: { where: { deletedAt: null }, select: { id: true, name: true } },
          },
        },
        settlements: { orderBy: { createdAt: "desc" }, take: 8 },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true, sortOrder: true },
    }),
  ]);
  if (!brand) notFound();
  const periodTo = new Date();
  const periodFrom = new Date(periodTo.getTime() - brand.settlementDays * 24 * 60 * 60 * 1000);
  const preview = await previewBrandSettlement(brand.id, periodFrom, periodTo).catch(() => null);

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

      {canManage ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Ajouter un produit</h2>
          <p className="mt-1 text-sm text-black/50">La marque et le stock partenaire sont déjà choisis. Indiquez teinte ou taille dans chaque variante.</p>
          <ProductForm
            categoryGroups={groupCategoriesForSelect(categories)}
            brands={[{ id: brand.id, name: brand.name }]}
            defaultBrandId={brand.id}
            defaultStockOwner="PARTNER"
          />
        </section>
      ) : null}

      <section className="mt-10 rounded-2xl bg-cream p-4">
        <h2 className="font-serif text-2xl">Conditions</h2>
        <p className="mt-1 text-sm text-black/50">{settlementRuleLabel(brand.partnershipType)}</p>
        {canManage ? (
          <form action={saveBrandTerms} className="mt-3 grid gap-2 md:grid-cols-2">
            <input type="hidden" name="brandId" value={brand.id} />
            <input name="commissionPercent" type="number" step="0.1" defaultValue={brand.commissionBps / 100} placeholder="Commission %" className="rounded-lg border px-2 py-1" />
            <input name="settlementDays" type="number" defaultValue={brand.settlementDays} placeholder="Délai de reversement (jours)" className="rounded-lg border px-2 py-1" />
            <input name="contactName" defaultValue={brand.contactName ?? ""} placeholder="Contact" className="rounded-lg border px-2 py-1" />
            <input name="contactPhone" defaultValue={brand.contactPhone ?? ""} placeholder="Téléphone" className="rounded-lg border px-2 py-1" />
            <input name="contactEmail" defaultValue={brand.contactEmail ?? ""} placeholder="Email" className="rounded-lg border px-2 py-1 md:col-span-2" />
            <button className="rounded-full bg-brown px-3 py-2 text-sm text-cream">Enregistrer</button>
          </form>
        ) : null}
      </section>

      {canManage && brand.products.some((product) => product.variants.length) ? (
        <form action={saveBrandIntake} className="mt-6 grid gap-2 rounded-2xl border border-dashed border-[#eee0e6] p-4">
          <h2 className="font-serif text-2xl">Entrée de marchandise</h2>
          <input type="hidden" name="brandId" value={brand.id} />
          <select name="variantId" className="rounded-lg border px-2 py-1">
            {brand.products.flatMap((product) =>
              product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {product.name} · {variant.name}
                </option>
              )),
            )}
          </select>
          <select name="kind" className="rounded-lg border px-2 py-1">
            <option value="PURCHASE">Achat (gros)</option>
            <option value="CONSIGNMENT">Dépôt-vente</option>
          </select>
          <input name="quantity" type="number" min={1} required placeholder="Quantité" className="rounded-lg border px-2 py-1" />
          <input name="unitCost" type="number" min={0} required placeholder="Prix d’achat ou de dépôt (FCFA)" className="rounded-lg border px-2 py-1" />
          <button className="rounded-full bg-brown px-3 py-2 text-sm text-cream">Entrer en stock</button>
        </form>
      ) : null}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Relevé</h2>
        {preview ? (
          <p className="mt-2 text-sm text-black/60">
            {preview.lines.length} ligne(s) · CA {formatCfa(preview.gross)} · coût {formatCfa(preview.cost)} · part NERA {formatCfa(preview.neraShare)} · à reverser {formatCfa(preview.brandShare)}
          </p>
        ) : null}
        {canManage ? (
          <form action={recordBrandSettlement} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="brandId" value={brand.id} />
            <input type="date" name="from" required defaultValue={periodFrom.toISOString().slice(0, 10)} className="rounded-lg border px-2 py-1" />
            <input type="date" name="to" required defaultValue={periodTo.toISOString().slice(0, 10)} className="rounded-lg border px-2 py-1" />
            <button className="rounded-full bg-brown px-3 py-1 text-sm text-cream">Enregistrer le relevé</button>
          </form>
        ) : null}
        <ul className="mt-3 space-y-2 text-sm">
          {brand.settlements.map((row) => (
            <li key={row.id} className="rounded-xl bg-cream px-3 py-2">
              {row.periodFrom.toLocaleDateString("fr-FR")} → {row.periodTo.toLocaleDateString("fr-FR")} · à reverser {formatCfa(row.brandShare)} · {row.status === "PAID" ? "payé" : "à payer"}
              {canManage && row.status !== "PAID" ? (
                <form action={markSettlementPaid} className="inline">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="brandId" value={brand.id} />
                  <button className="ml-2 underline">Marquer payé</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

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
