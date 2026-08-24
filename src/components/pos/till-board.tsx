import { addTillExpense, closeRegister } from "@/app/actions/pos";
import { formatCfa } from "@/lib/money";
import type { TillSnapshot } from "@/lib/till";

export function TillBoard({
  snapshot,
  categories,
}: {
  snapshot: TillSnapshot;
  categories: { id: string; name: string }[];
}) {
  return (
    <section className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-5">
      <h2 className="font-serif text-2xl text-wine">Caisse du jour</h2>
      <p className="mt-1 text-sm text-black/50">
        Le fond d’ouverture reste affiché. Les ventes s’ajoutent toutes seules. Une dépense est déduite des recettes
        et des espèces.
      </p>
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
        <form action={addTillExpense} className="rounded-2xl border border-[#eee0e6] p-4">
          <h3 className="font-medium text-wine">Ajouter une dépense</h3>
          <p className="mt-1 text-sm text-black/50">Taxi, eau, courses… le montant est retiré des recettes tout de suite.</p>
          <input
            name="description"
            required
            placeholder="Motif (ex. taxi, bouteille d’eau)"
            className="mt-3 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              name="amount"
              type="number"
              min={1}
              required
              placeholder="Montant FCFA"
              className="min-w-[8rem] flex-1 rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
            />
            <select name="categoryId" className="min-w-[9rem] flex-1 rounded-xl border border-[#eee0e6] px-3 py-2 text-sm">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className="mt-3 rounded-full bg-brown px-5 py-2 text-sm text-cream">Enregistrer la dépense</button>
        </form>

        <form action={closeRegister} className="rounded-2xl border border-[#eee0e6] p-4">
          <h3 className="font-medium text-wine">Fermeture de caisse</h3>
          <p className="mt-1 text-sm text-black/50">
            En fin de journée, cliquez sur fermer. Si vous ne comptez pas les billets, le montant attendu
            ({formatCfa(snapshot.expectedCash)}) est utilisé.
          </p>
          <input
            name="actualCash"
            type="number"
            min={0}
            placeholder={`Espèces comptées (optionnel) — ${snapshot.expectedCash}`}
            className="mt-3 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
          />
          <button className="mt-3 w-full rounded-full bg-wine px-5 py-3 text-cream">Fermeture de caisse</button>
        </form>
      </div>
    </section>
  );
}
