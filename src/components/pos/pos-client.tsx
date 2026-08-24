"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { closeRegister, openRegister, searchPosProducts, submitPosSale } from "@/app/actions/pos";
import { PaymentMethod } from "@prisma/client";

type Variant = {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  promoPrice: number | null;
  product: { name: string };
  inventories: { onHand: number; reserved: number }[];
};

type Line = { variant: Variant; quantity: number };

export function PosClient({
  initial,
  openSession,
}: {
  initial: Variant[];
  openSession: { id: string; openingFloat: number } | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);
  const [cart, setCart] = useState<Line[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [ticket, setTicket] = useState<{ number: string; total: number; items: Line[] } | null>(null);
  const [pending, start] = useTransition();
  const total = useMemo(() => cart.reduce((s, l) => s + unitPrice(l.variant) * l.quantity, 0), [cart]);

  function add(variant: Variant) {
    setCart((c) => {
      const i = c.find((x) => x.variant.id === variant.id);
      if (i) return c.map((x) => (x.variant.id === variant.id ? { ...x, quantity: x.quantity + 1 } : x));
      return [...c, { variant, quantity: 1 }];
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {!openSession ? (
        <form action={openRegister} className="rounded-2xl bg-cream p-6 lg:col-span-2">
          <h2 className="font-serif text-2xl">Ouvrir la caisse</h2>
          <input name="openingFloat" type="number" defaultValue={0} className="mt-4 rounded-xl border px-3 py-2" />
          <button className="ml-3 rounded-full bg-brown px-5 py-2 text-cream">Ouvrir</button>
        </form>
      ) : null}
      <section>
        <input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            start(async () => setResults(await searchPosProducts(v)));
          }}
          placeholder="Nom, SKU ou code-barres"
          className="w-full rounded-2xl border px-4 py-3"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((v) => (
            <button key={v.id} onClick={() => add(v)} className="rounded-2xl bg-cream p-4 text-left">
              <p className="font-medium">{v.product.name}</p>
              <p className="text-sm text-black/50">{v.name} · {v.sku}</p>
              <p className="mt-2">{formatCfa(unitPrice(v))}</p>
            </button>
          ))}
        </div>
      </section>
      <aside className="rounded-2xl bg-cream p-5">
        <h2 className="font-serif text-2xl">Panier</h2>
        <ul className="mt-4 space-y-2">
          {cart.map((l) => (
            <li key={l.variant.id} className="flex justify-between text-sm">
              <span>{l.variant.product.name} × {l.quantity}</span>
              <span>{formatCfa(unitPrice(l.variant) * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-serif text-3xl">{formatCfa(total)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["CASH", "MOBILE_MONEY", "CARD", "OTHER"] as PaymentMethod[]).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`rounded-full px-3 py-1 text-sm ${method === m ? "bg-brown text-cream" : "bg-white"}`}>
              {m}
            </button>
          ))}
        </div>
        <button
          disabled={!cart.length || pending}
          onClick={() =>
            start(async () => {
              const sale = await submitPosSale({
                lines: cart.map((l) => ({ variantId: l.variant.id, quantity: l.quantity })),
                payments: [{ method, amount: total }],
              });
              setTicket({ number: sale.number, total: sale.total, items: cart });
              setCart([]);
            })
          }
          className="mt-4 w-full rounded-full bg-brown py-3 text-cream"
        >
          Encaisser
        </button>
        {openSession ? (
          <form action={closeRegister} className="mt-6 border-t pt-4">
            <input name="actualCash" type="number" placeholder="Espèces réelles" className="w-full rounded-xl border px-3 py-2" />
            <button className="mt-2 text-sm">Fermer la caisse</button>
          </form>
        ) : null}
      </aside>
      {ticket ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <p className="font-serif text-2xl">NERA Beauté & Shop</p>
            <p className="text-sm">{ticket.number}</p>
            <ul className="mt-4 text-sm">
              {ticket.items.map((l) => (
                <li key={l.variant.id} className="flex justify-between">
                  <span>{l.variant.product.name} × {l.quantity}</span>
                  <span>{formatCfa(unitPrice(l.variant) * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-serif text-2xl">{formatCfa(ticket.total)}</p>
            <button onClick={() => { window.print(); setTicket(null); }} className="mt-4 w-full rounded-full bg-brown py-2 text-cream">
              Imprimer / fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
