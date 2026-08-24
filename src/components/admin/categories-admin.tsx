"use client";

import { useState, useTransition } from "react";
import { deleteCategory, saveCategory, updateCategory } from "@/app/actions/admin";
import { categoryDeleteBlocker } from "@/lib/categories";

export type CategoryCard = {
  id: string;
  name: string;
  productCount: number;
  childCount: number;
};

export function CategoriesAdmin({
  roots,
  childrenByParent,
  canCreate,
  canUpdate,
  canDelete,
}: {
  roots: CategoryCard[];
  childrenByParent: Record<string, CategoryCard[]>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setError(null);
    setMessage(null);
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Action impossible.");
        return;
      }
      setMessage(success);
      setEditingId(null);
    });
  }

  function beginEdit(row: CategoryCard) {
    setEditingId(row.id);
    setEditName(row.name);
    setError(null);
  }

  function remove(row: CategoryCard, kind: "rayon" | "sous-rayon") {
    const blocked = categoryDeleteBlocker({
      childCount: row.childCount,
      productCount: row.productCount,
    });
    if (blocked) {
      setError(blocked);
      return;
    }
    const typed = window.prompt(
      `Pour éviter une suppression par erreur, tapez le nom exact du ${kind} :\n\n${row.name}`,
    );
    if (typed === null) return;
    if (typed.trim() !== row.name) {
      setError("Le nom ne correspond pas. Le rayon n’a pas été supprimé.");
      return;
    }
    const data = new FormData();
    data.set("id", row.id);
    run(() => deleteCategory(data), `${kind === "rayon" ? "Rayon" : "Sous-rayon"} « ${row.name} » masqué.`);
  }

  function saveName(id: string) {
    const name = editName.trim();
    if (!name) {
      setError("Indiquez un nom.");
      return;
    }
    const data = new FormData();
    data.set("id", id);
    data.set("name", name);
    run(() => updateCategory(data), "Nom enregistré.");
  }

  function add(form: HTMLFormElement, success: string) {
    const data = new FormData(form);
    run(async () => {
      const result = await saveCategory(data);
      if (result.ok) form.reset();
      return result;
    }, success);
  }

  return (
    <div>
      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {canCreate ? (
        <form
          className="mt-6 rounded-2xl border border-[#eee0e6] bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            add(e.currentTarget, "Rayon ajouté.");
          }}
        >
          <h2 className="font-serif text-2xl text-wine">Ajouter un rayon</h2>
          <p className="mt-1 text-sm text-black/50">Un rayon est une grande catégorie (Beauté, Cheveux, Mode…).</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input name="name" required placeholder="Nom du rayon" className="min-w-[16rem] flex-1 rounded-xl border px-3 py-2" />
            <button disabled={pending} className="rounded-full bg-brown px-5 py-2 text-cream disabled:opacity-60">
              Ajouter un rayon
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-8 space-y-6">
        {roots.length === 0 ? (
          <div className="rounded-2xl border border-[#eee0e6] bg-white p-8">
            <p className="font-medium text-wine">Aucun rayon pour le moment</p>
            <p className="mt-2 text-sm text-black/55">
              Ajoutez un rayon ci-dessus, ou installez le catalogue NERA.
            </p>
          </div>
        ) : null}
        {roots.map((root) => {
          const children = childrenByParent[root.id] ?? [];
          return (
            <section key={root.id} className="rounded-2xl bg-cream p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editingId === root.id ? (
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-xl border px-3 py-2"
                        aria-label="Nouveau nom du rayon"
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => saveName(root.id)}
                        className="rounded-full bg-brown px-4 py-2 text-sm text-cream"
                      >
                        Enregistrer
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-full border px-4 py-2 text-sm">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <h2 className="font-serif text-2xl">
                      {root.name}{" "}
                      <span className="font-sans text-sm text-black/40">
                        {root.productCount} produit(s) · {children.length} sous-rayon(s)
                      </span>
                    </h2>
                  )}
                </div>
                {editingId === root.id ? null : (
                  <div className="flex flex-wrap gap-2">
                    {canUpdate ? (
                      <button type="button" onClick={() => beginEdit(root)} className="rounded-full border px-3 py-1 text-sm">
                        Modifier le rayon
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => remove(root, "rayon")}
                        className="rounded-full px-3 py-1 text-sm text-red-700"
                      >
                        Supprimer le rayon
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {children.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2">
                    {editingId === child.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-xl border px-3 py-1 text-sm"
                          aria-label="Nouveau nom du sous-rayon"
                        />
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => saveName(child.id)}
                          className="rounded-full bg-brown px-3 py-1 text-xs text-cream"
                        >
                          Enregistrer
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs underline">
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm">
                        {child.name}
                        {child.productCount ? (
                          <span className="text-black/40"> · {child.productCount} produit(s)</span>
                        ) : null}
                      </span>
                    )}
                    {editingId === child.id ? null : (
                      <span className="flex gap-2">
                        {canUpdate ? (
                          <button type="button" onClick={() => beginEdit(child)} className="text-xs underline">
                            Modifier
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button type="button" onClick={() => remove(child, "sous-rayon")} className="text-xs text-red-700 underline">
                            Supprimer
                          </button>
                        ) : null}
                      </span>
                    )}
                  </li>
                ))}
                {children.length === 0 ? (
                  <li className="text-sm text-black/45">Aucun sous-rayon. Ajoutez-en un ci-dessous.</li>
                ) : null}
              </ul>

              {canCreate ? (
                <form
                  className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    add(e.currentTarget, `Sous-rayon ajouté dans « ${root.name} ».`);
                  }}
                >
                  <input type="hidden" name="parentId" value={root.id} />
                  <input
                    name="name"
                    required
                    placeholder="Nom du sous-rayon"
                    className="min-w-[14rem] flex-1 rounded-xl border px-3 py-2 text-sm"
                  />
                  <button disabled={pending} className="rounded-full bg-brown px-4 py-2 text-sm text-cream disabled:opacity-60">
                    Ajouter un sous-rayon
                  </button>
                </form>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
