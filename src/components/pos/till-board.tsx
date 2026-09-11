"use client";

import { useCallback, useEffect, useState } from "react";
import { closeRegister } from "@/app/actions/pos";
import { PendingSubmitButton } from "@/components/admin/form-pending";
import { TillExpenseForm } from "@/components/pos/till-expense-form";
import { formatCfa } from "@/lib/money";
import type { TillSnapshot } from "@/lib/till";

export function TillBoard({
  snapshot: initial,
  categories,
  openedByName,
  openedAt,
}: {
  snapshot: TillSnapshot;
  categories: { id: string; name: string }[];
  openedByName?: string;
  openedAt?: Date | string;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [flash, setFlash] = useState<string | null>(null);
  const openedLabel = openedAt
    ? new Date(openedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  const onSnapshot = useCallback((next: TillSnapshot, message: string) => {
    setSnapshot(next);
    setFlash(message);
  }, []);

  return (
    <section className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-5">
      <h2 className="font-serif text-2xl text-wine">Caisse ouverte</h2>
      {openedByName ? (
        <p className="mt-2 rounded-2xl bg-blush px-4 py-2 text-sm font-medium text-wine">
          Ouverte par {openedByName}
          {openedLabel ? ` à ${openedLabel}` : ""} — fermez-la quand vous voulez, même en journée.
        </p>
      ) : null}
      <p className="mt-1 text-sm text-black/50">
        Le fond d’ouverture reste affiché. Les ventes s’ajoutent toutes seules. Une dépense est déduite des recettes
        et des espèces tout de suite.
      </p>
      {flash ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800" role="status">
          {flash}
        </p>
      ) : null}
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-blush p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Fond d’ouverture</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(snapshot.openingFloat)}</dd>
        </div>
        <div className="rounded-2xl bg-blush p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">
            Ventes ({snapshot.salesCount} ticket{snapshot.salesCount === 1 ? "" : "s"})
          </dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(snapshot.salesTotal)}</dd>
        </div>
        <div className="rounded-2xl bg-blush p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Dépenses</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(snapshot.expensesTotal)}</dd>
        </div>
        <div className="rounded-2xl bg-blush p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Recette nette</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(snapshot.netRevenue)}</dd>
        </div>
        <div className="rounded-2xl border border-gold/40 bg-champagne p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Espèces attendues</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(snapshot.expectedCash)}</dd>
        </div>
      </dl>
      {snapshot.otherSales > 0 ? (
        <p className="mt-3 text-sm text-black/50">
          Dont espèces {formatCfa(snapshot.cashSales)} · autres paiements {formatCfa(snapshot.otherSales)} (non dans
          le tiroir).
        </p>
      ) : null}

      {snapshot.expenses.length ? (
        <ul className="mt-4 space-y-1 text-sm text-black/60">
          {snapshot.expenses.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span>
                {e.categoryName}
                {e.description ? ` · ${e.description}` : ""}
              </span>
              <span>− {formatCfa(e.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-black/45">Aucune dépense pour l’instant. Vous pouvez fermer la caisse tel quel.</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TillExpenseForm sessionId={snapshot.sessionId} categories={categories} onSnapshot={onSnapshot} />

        <form action={closeRegister} className="rounded-2xl border border-[#eee0e6] p-4">
          <h3 className="font-medium text-wine">Fermer la caisse</h3>
          <p className="mt-1 text-sm text-black/50">
            À n’importe quelle heure. Si vous ne comptez pas les billets, le montant attendu (
            {formatCfa(snapshot.expectedCash)}) est utilisé. Ensuite vous pourrez la rouvrir tout de suite.
          </p>
          <input type="hidden" name="sessionId" value={snapshot.sessionId} />
          <input
            name="actualCash"
            inputMode="numeric"
            placeholder={`Espèces comptées (optionnel) — ${snapshot.expectedCash}`}
            className="mt-3 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
          />
          <PendingSubmitButton
            idle="Fermer la caisse maintenant"
            pendingLabel="Fermeture…"
            className="mt-3 w-full rounded-full bg-wine px-5 py-3 text-cream disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
      </div>
    </section>
  );
}
