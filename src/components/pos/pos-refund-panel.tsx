"use client";

import { useEffect, useState, useTransition } from "react";
import { formatCfa } from "@/lib/money";
import { PAYMENT_LABELS } from "@/lib/receipt";
import { refundPosSale, searchPosSales } from "@/app/actions/pos";

type SaleHit = Awaited<ReturnType<typeof searchPosSales>>[number];

function formatWhen(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PosRefundPanel() {
  const [query, setQuery] = useState("");
  const [sales, setSales] = useState<SaleHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => setSales(await searchPosSales("")));
  }, []);

  function search() {
    setError(null);
    setOk(null);
    start(async () => setSales(await searchPosSales(query)));
  }

  function refund(sale: SaleHit) {
    if (!confirm(`Rembourser ${sale.number} (${formatCfa(sale.total)}) et remettre le stock ?`)) return;
    setError(null);
    setOk(null);
    start(async () => {
      const result = await refundPosSale(sale.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOk(`${sale.number} remboursé. Stock remis.`);
      setSales((list) => list.filter((item) => item.id !== sale.id));
    });
  }

  return (
    <section className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-5">
      <h2 className="font-serif text-2xl text-wine">Retour / remboursement</h2>
      <p className="mt-1 text-sm text-black/50">
        Cherchez un ticket (numéro POS-…) ou le téléphone de la cliente. Le stock revient en rayon.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="N° ticket ou téléphone"
          className="w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
        />
        <button type="button" onClick={search} disabled={pending} className="rounded-full bg-blush px-4 py-2 text-sm text-wine">
          {pending ? "…" : "Chercher"}
        </button>
      </div>
      {ok ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-4 space-y-2">
        {sales.map((sale) => {
          const customer = sale.customer
            ? `${sale.customer.firstName} ${sale.customer.lastName}`.trim()
            : "Cliente de passage";
          const methods = sale.payments.map((p) => PAYMENT_LABELS[p.method] ?? p.method).join(" + ");
          return (
            <li key={sale.id} className="rounded-2xl border border-[#eee0e6] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-wine">{sale.number}</p>
                  <p className="text-xs text-black/50">
                    {formatWhen(sale.createdAt)} · {customer}
                    {sale.customer?.phone ? ` · ${sale.customer.phone}` : ""}
                    {methods ? ` · ${methods}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-black/45">
                    {sale.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-xl text-wine">{formatCfa(sale.total)}</p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => refund(sale)}
                    className="mt-1 text-sm text-red-700 underline"
                  >
                    Rembourser
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!sales.length && !pending ? (
        <p className="mt-4 text-sm text-black/45">Aucun ticket. Laissez vide pour voir les dernières ventes.</p>
      ) : null}
    </section>
  );
}
