import { saveCategory, updateCategory, deleteCategory } from "@/app/actions/admin";
import { categoryDeleteBlocker } from "@/lib/categories";

export type CategoryCard = {
  id: string;
  name: string;
  productCount: number;
  childCount: number;
};

function DeleteLock({
  id,
  name,
  childCount,
  productCount,
  kind,
}: {
  id: string;
  name: string;
  childCount: number;
  productCount: number;
  kind: "rayon" | "sous-rayon";
}) {
  const blocked = categoryDeleteBlocker({ childCount, productCount });
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-red-700">Supprimer le {kind}</summary>
      {blocked ? (
        <p className="mt-2 max-w-md text-black/60">{blocked}</p>
      ) : (
        <form action={deleteCategory} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <input
            name="confirmName"
            required
            placeholder={`Tapez « ${name} »`}
            className="min-w-[12rem] rounded-xl border px-3 py-1"
            aria-label={`Confirmer le nom du ${kind}`}
          />
          <button className="rounded-full bg-red-700 px-3 py-1 text-xs text-white">Confirmer</button>
        </form>
      )}
    </details>
  );
}

export function CategoriesAdmin({
  roots,
  childrenByParent,
  canCreate,
  canUpdate,
  canDelete,
  notice,
}: {
  roots: CategoryCard[];
  childrenByParent: Record<string, CategoryCard[]>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  notice?: { kind: "ok" | "erreur"; text: string } | null;
}) {
  return (
    <div>
      {notice ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            notice.kind === "erreur"
              ? "border border-red-200 bg-red-50 text-red-800"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          role={notice.kind === "erreur" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      ) : null}

      {canCreate ? (
        <form action={saveCategory} className="mt-6 rounded-2xl border border-[#eee0e6] bg-white p-5">
          <h2 className="font-serif text-2xl text-wine">Ajouter un rayon</h2>
          <p className="mt-1 text-sm text-black/50">Un rayon est une grande catégorie (Beauté, Cheveux, Mode…).</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input name="name" required placeholder="Nom du rayon" className="min-w-[16rem] flex-1 rounded-xl border px-3 py-2" />
            <button className="rounded-full bg-brown px-5 py-2 text-cream">Ajouter un rayon</button>
          </div>
        </form>
      ) : null}

      <div className="mt-8 space-y-6">
        {roots.length === 0 ? (
          <div className="rounded-2xl border border-[#eee0e6] bg-white p-8">
            <p className="font-medium text-wine">Aucun rayon pour le moment</p>
            <p className="mt-2 text-sm text-black/55">Ajoutez un rayon ci-dessus, ou installez le catalogue NERA.</p>
          </div>
        ) : null}
        {roots.map((root) => {
          const children = childrenByParent[root.id] ?? [];
          return (
            <section key={root.id} className="rounded-2xl bg-cream p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-serif text-2xl">
                  {root.name}{" "}
                  <span className="font-sans text-sm text-black/40">
                    {root.productCount} produit(s) · {children.length} sous-rayon(s)
                  </span>
                </h2>
                <div className="flex flex-wrap items-start gap-4">
                  {canUpdate ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer">Modifier le rayon</summary>
                      <form action={updateCategory} className="mt-2 flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={root.id} />
                        <input name="name" required defaultValue={root.name} className="rounded-xl border px-3 py-1" />
                        <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">Enregistrer</button>
                      </form>
                    </details>
                  ) : null}
                  {canDelete ? (
                    <DeleteLock
                      id={root.id}
                      name={root.name}
                      childCount={root.childCount}
                      productCount={root.productCount}
                      kind="rayon"
                    />
                  ) : null}
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {children.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2">
                    <span className="text-sm">
                      {child.name}
                      {child.productCount ? <span className="text-black/40"> · {child.productCount} produit(s)</span> : null}
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      {canUpdate ? (
                        <details className="text-sm">
                          <summary className="cursor-pointer">Modifier</summary>
                          <form action={updateCategory} className="mt-2 flex flex-wrap gap-2">
                            <input type="hidden" name="id" value={child.id} />
                            <input name="name" required defaultValue={child.name} className="rounded-xl border px-3 py-1 text-sm" />
                            <button className="rounded-full bg-brown px-3 py-1 text-xs text-cream">Enregistrer</button>
                          </form>
                        </details>
                      ) : null}
                      {canDelete ? (
                        <DeleteLock
                          id={child.id}
                          name={child.name}
                          childCount={0}
                          productCount={child.productCount}
                          kind="sous-rayon"
                        />
                      ) : null}
                    </span>
                  </li>
                ))}
                {children.length === 0 ? (
                  <li className="text-sm text-black/45">Aucun sous-rayon. Ajoutez-en un ci-dessous.</li>
                ) : null}
              </ul>

              {canCreate ? (
                <form action={saveCategory} className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4">
                  <input type="hidden" name="parentId" value={root.id} />
                  <input
                    name="name"
                    required
                    placeholder="Nom du sous-rayon"
                    className="min-w-[14rem] flex-1 rounded-xl border px-3 py-2 text-sm"
                  />
                  <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Ajouter un sous-rayon</button>
                </form>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
