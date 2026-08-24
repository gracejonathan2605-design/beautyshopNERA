"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveProduct, type ProductFormState } from "@/app/actions/admin";

const INITIAL: ProductFormState = { ok: false };

export function ProductForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveProduct, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-4">
      {state.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 md:col-span-4">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-4">
          {state.name} a été ajouté à la boutique.
          {state.warning ? ` ${state.warning}` : ""}
        </p>
      ) : null}
      <input name="name" required placeholder="Nom du produit" className="rounded-xl border px-3 py-2" />
      <input name="sku" placeholder="SKU (optionnel)" className="rounded-xl border px-3 py-2" />
      <input name="salePrice" inputMode="numeric" required placeholder="Prix vente (FCFA)" className="rounded-xl border px-3 py-2" />
      <input name="costPrice" inputMode="numeric" placeholder="Prix achat (FCFA)" className="rounded-xl border px-3 py-2" />
      <input name="stock" inputMode="numeric" placeholder="Stock initial" className="rounded-xl border px-3 py-2" />
      <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="rounded-xl border px-3 py-2 text-sm" />
      <select name="categoryId" className="rounded-xl border px-3 py-2">
        <option value="">Catégorie</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFeatured" /> Vedette
      </label>
      <button disabled={pending} className="rounded-full bg-brown py-2 text-cream disabled:opacity-60">
        {pending ? "Enregistrement…" : "Créer"}
      </button>
    </form>
  );
}
