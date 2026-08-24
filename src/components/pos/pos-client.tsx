"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { closeRegister, openRegister, searchPosProducts, submitPosSale } from "@/app/actions/pos";
import { PaymentMethod } from "@prisma/client";
import { PAYMENT_LABELS, saleToReceipt, type ReceiptData, type ReceiptShop } from "@/lib/receipt";
import { ReceiptTicket } from "@/components/pos/receipt-ticket";

type Variant = {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  promoPrice: number | null;
  product: { name: string; images?: { url: string }[] };
  inventories: { onHand: number; reserved: number }[];
};

type Line = { variant: Variant; quantity: number };

const METHODS: PaymentMethod[] = ["CASH", "MOBILE_MONEY", "CARD", "OTHER"];

export function PosClient({
  initial,
  openSession,
  shop,
}: {
  initial: Variant[];
  openSession: { id: string; openingFloat: number } | null;
  shop: ReceiptShop;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);
  const [cart, setCart] = useState<Line[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [customerPhone, setCustomerPhone] = useState("");
  const [ticket, setTicket] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [searching, startSearch] = useTransition();
  const total = useMemo(() => cart.reduce((s, l) => s + unitPrice(l.variant) * l.quantity, 0), [cart]);

  function add(variant: Variant) {
    setCart((c) => {
      const i = c.find((x) => x.variant.id === variant.id);
      if (i) return c.map((x) => (x.variant.id === variant.id ? { ...x, quantity: x.quantity + 1 } : x));
      return [...c, { variant, quantity: 1 }];
    });
  }

  function setQty(variantId: string, quantity: number) {
    setCart((c) => {
      if (quantity <= 0) return c.filter((l) => l.variant.id !== variantId);
      return c.map((l) => (l.variant.id === variantId ? { ...l, quantity } : l));
    });
  }

  function checkout() {
    if (!cart.length || pending) return;
    setError(null);
    start(async () => {
      try {
        const result = await submitPosSale({
          lines: cart.map((l) => ({ variantId: l.variant.id, quantity: l.quantity })),
          payments: [{ method, amount: total }],
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const receipt = saleToReceipt(result.sale, shop);
        if (customerPhone) receipt.customerPhone = customerPhone;
        setTicket(receipt);
        setCart([]);
        setCustomerPhone("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "L’encaissement n’a pas abouti.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {!openSession ? (
        <form action={openRegister} className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-6 lg:col-span-2">
          <h2 className="font-serif text-2xl text-wine">Ouvrir la caisse</h2>
          <p className="mt-1 text-sm text-black/50">
            Indiquez le fond de caisse du matin. Vous pouvez aussi encaisser directement : la caisse s’ouvre toute
            seule.
          </p>
          <input name="openingFloat" type="number" defaultValue={0} className="mt-4 rounded-xl border border-[#eee0e6] px-3 py-2" />
          <button className="ml-3 rounded-full bg-brown px-5 py-2 text-cream">Ouvrir</button>
        </form>
      ) : null}
      <section>
        <input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            startSearch(async () => setResults(await searchPosProducts(v)));
          }}
          placeholder="Nom, SKU ou code-barres"
          aria-busy={searching}
          className="w-full rounded-2xl border border-[#eee0e6] bg-white px-4 py-3"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((v) => (
            <button
              key={v.id}
              onClick={() => add(v)}
              className="rounded-[1.4rem] border border-[#eee0e6] bg-white p-4 text-left hover:border-gold"
            >
              {v.product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.product.images[0].url}
                  alt=""
                  loading="lazy"
                  className="mb-2 h-24 w-full rounded-xl object-cover"
                />
              ) : null}
              <p className="font-medium text-wine">{v.product.name}</p>
              <p className="text-sm text-black/50">
                {v.name} · {v.sku}
              </p>
              <p className="mt-2">{formatCfa(unitPrice(v))}</p>
            </button>
          ))}
        </div>
      </section>
      <aside className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-5">
        <h2 className="font-serif text-2xl text-wine">Ticket en cours</h2>
        <ul className="mt-4 space-y-3">
          {cart.map((l) => (
            <li key={l.variant.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{l.variant.product.name}</span>
                <span className="text-black/40">{formatCfa(unitPrice(l.variant))}</span>
              </span>
              <span className="flex items-center gap-2">
                <button type="button" className="h-7 w-7 rounded-full border" onClick={() => setQty(l.variant.id, l.quantity - 1)}>
                  −
                </button>
                {l.quantity}
                <button type="button" className="h-7 w-7 rounded-full border" onClick={() => setQty(l.variant.id, l.quantity + 1)}>
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
        {!cart.length ? <p className="mt-4 text-sm text-black/45">Touchez un produit pour l’ajouter au ticket.</p> : null}
        <p className="mt-4 font-serif text-3xl text-wine">{formatCfa(total)}</p>
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="WhatsApp cliente (optionnel)"
          className="mt-4 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`rounded-full px-3 py-1 text-sm ${method === m ? "bg-brown text-cream" : "bg-blush text-wine"}`}
            >
              {PAYMENT_LABELS[m] ?? m}
            </button>
          ))}
        </div>
        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!cart.length || pending}
          onClick={checkout}
          className="mt-4 w-full rounded-full bg-brown py-3 text-cream disabled:opacity-50"
        >
          {pending ? "Encaissement…" : "Encaisser"}
        </button>
        {openSession ? (
          <form action={closeRegister} className="mt-6 border-t border-[#eee0e6] pt-4">
            <input name="actualCash" type="number" placeholder="Espèces réelles" className="w-full rounded-xl border border-[#eee0e6] px-3 py-2" />
            <button className="mt-2 text-sm text-wine underline">Fermer la caisse</button>
          </form>
        ) : null}
      </aside>
      {ticket ? <ReceiptTicket data={ticket} onClose={() => setTicket(null)} /> : null}
    </div>
  );
}
