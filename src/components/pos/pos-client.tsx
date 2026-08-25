"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCfa, parseCfaInput } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import {
  discardHeldTicket,
  openRegister,
  parkPosTicket,
  resumeHeldTicket,
  scanPosBarcode,
  searchPosProducts,
  submitPosSale,
  type HeldTicketRow,
} from "@/app/actions/pos";
import { PaymentMethod } from "@prisma/client";
import { PAYMENT_LABELS, saleToReceipt, type ReceiptData, type ReceiptShop } from "@/lib/receipt";
import { ReceiptTicket } from "@/components/pos/receipt-ticket";
import { PosCustomerCard, type PosCustomerCardData } from "@/components/pos/pos-customer-card";
import { PosRefundPanel } from "@/components/pos/pos-refund-panel";
import {
  buildCheckoutPayments,
  pickExactScanMatch,
  ticketTotals,
  type PosVariant,
} from "@/lib/pos";

type Line = { variant: PosVariant; quantity: number; discount: number };

const METHODS: PaymentMethod[] = ["CASH", "MOBILE_MONEY", "CARD", "OTHER"];

export function PosClient({
  initial,
  openSession,
  shop,
  canRefund,
  initialHeld,
}: {
  initial: PosVariant[];
  openSession: { id: string; openingFloat: number } | null;
  shop: ReceiptShop;
  canRefund: boolean;
  initialHeld: HeldTicketRow[];
}) {
  const router = useRouter();
  const scanRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"vente" | "retour">("vente");
  const [scanMode, setScanMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);
  const [cart, setCart] = useState<Line[]>([]);
  const [ticketDiscount, setTicketDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [mixed, setMixed] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [momoInput, setMomoInput] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customer, setCustomer] = useState<PosCustomerCardData | null>(null);
  const [held, setHeld] = useState(initialHeld);
  const [heldNote, setHeldNote] = useState("");
  const [ticket, setTicket] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [searching, startSearch] = useTransition();

  const totals = useMemo(
    () =>
      ticketTotals(
        cart.map((line) => ({
          unitPrice: unitPrice(line.variant),
          quantity: line.quantity,
          discount: line.discount,
        })),
        ticketDiscount,
      ),
    [cart, ticketDiscount],
  );
  const cashAmount = parseCfaInput(cashInput);
  const momoAmount = momoInput.trim() === "" ? null : parseCfaInput(momoInput);
  const pay = useMemo(
    () =>
      buildCheckoutPayments({
        mixed,
        method,
        total: totals.total,
        cashAmount,
        momoAmount,
      }),
    [mixed, method, totals.total, cashAmount, momoAmount],
  );

  useEffect(() => {
    if (scanMode) scanRef.current?.focus();
  }, [scanMode]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 2000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (scanMode) return;
    const timer = window.setTimeout(() => {
      startSearch(async () => setResults(await searchPosProducts(query)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, scanMode]);

  function available(variant: PosVariant) {
    return variant.inventories.reduce((sum, row) => sum + (row.onHand - row.reserved), 0);
  }

  function add(variant: PosVariant) {
    if (available(variant) <= 0) {
      setError(`Rupture : ${variant.product.name}`);
      return;
    }
    setError(null);
    setCart((current) => {
      const existing = current.find((line) => line.variant.id === variant.id);
      if (existing) {
        return current.map((line) =>
          line.variant.id === variant.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { variant, quantity: 1, discount: 0 }];
    });
    setFlash(`${variant.product.name} ajouté`);
  }

  function setQty(variantId: string, quantity: number) {
    setCart((current) => {
      if (quantity <= 0) return current.filter((line) => line.variant.id !== variantId);
      return current.map((line) => (line.variant.id === variantId ? { ...line, quantity } : line));
    });
  }

  function setLineDiscount(variantId: string, discount: number) {
    setCart((current) =>
      current.map((line) => (line.variant.id === variantId ? { ...line, discount } : line)),
    );
  }

  function clearTicket() {
    setCart([]);
    setTicketDiscount(0);
    setCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCashInput("");
    setMomoInput("");
    setHeldNote("");
    setMixed(false);
    setMethod("CASH");
  }

  function onScanEnter() {
    const code = query.trim();
    if (!code || pending) return;
    setError(null);
    start(async () => {
      const scanned = await scanPosBarcode(code);
      if (scanned.ok) {
        add(scanned.variant);
        setQuery("");
        scanRef.current?.focus();
        return;
      }
      const fallback = pickExactScanMatch(results, code);
      if (fallback) {
        add(fallback);
        setQuery("");
        scanRef.current?.focus();
        return;
      }
      setError(scanned.error);
    });
  }

  function checkout() {
    if (!cart.length || pending) return;
    if (!openSession) {
      setError("Ouvrez d’abord la caisse avec le fond du matin.");
      return;
    }
    if (pay.remaining > 0) {
      setError(`Il reste ${formatCfa(pay.remaining)} à encaisser.`);
      return;
    }
    if (!pay.payments.length) {
      setError("Indiquez un paiement.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        const result = await submitPosSale({
          lines: cart.map((line) => ({
            variantId: line.variant.id,
            quantity: line.quantity,
            discount: line.discount || undefined,
          })),
          payments: pay.payments,
          discount: totals.cartDiscount || undefined,
          customerId: customer?.id,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const receipt = saleToReceipt(result.sale, shop);
        if (customerPhone) receipt.customerPhone = customerPhone;
        setTicket(receipt);
        clearTicket();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "L’encaissement n’a pas abouti.");
      }
    });
  }

  function park() {
    if (!cart.length || pending) return;
    setError(null);
    start(async () => {
      const result = await parkPosTicket({
        note: heldNote,
        payload: {
          lines: cart,
          ticketDiscount,
          customerId: customer?.id,
          customerPhone,
          customerName,
          mixed,
          method,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHeld((current) => [result.ticket, ...current]);
      clearTicket();
      setFlash("Ticket mis en attente");
    });
  }

  function resume(id: string) {
    if (cart.length && !confirm("Remplacer le ticket en cours par celui en attente ?")) return;
    setError(null);
    start(async () => {
      const result = await resumeHeldTicket(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const payload = result.ticket.payload;
      setCart(payload.lines ?? []);
      setTicketDiscount(payload.ticketDiscount ?? 0);
      setCustomerName(payload.customerName ?? "");
      setCustomerPhone(payload.customerPhone ?? "");
      setCustomer(payload.customerId ? { id: payload.customerId, code: "", firstName: payload.customerName || "Cliente", lastName: "", phone: payload.customerPhone || null, totalSpent: 0, sales: [] } : null);
      setMixed(Boolean(payload.mixed));
      setMethod(payload.method ?? "CASH");
      setHeld((current) => current.filter((row) => row.id !== id));
      setTab("vente");
    });
  }

  function discard(id: string) {
    start(async () => {
      const result = await discardHeldTicket(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHeld((current) => current.filter((row) => row.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {canRefund ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Caisse">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "vente"}
            onClick={() => setTab("vente")}
            className={`rounded-full px-4 py-2 text-sm ${tab === "vente" ? "bg-brown text-cream" : "bg-blush text-wine"}`}
          >
            Vente
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "retour"}
            onClick={() => setTab("retour")}
            className={`rounded-full px-4 py-2 text-sm ${tab === "retour" ? "bg-brown text-cream" : "bg-blush text-wine"}`}
          >
            Retour / remboursement
          </button>
        </div>
      ) : null}

      {tab === "retour" && canRefund ? <PosRefundPanel /> : null}

      {tab === "vente" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {!openSession ? (
            <form action={openRegister} className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-6 lg:col-span-2">
              <h2 className="font-serif text-2xl text-wine">Ouvrir la caisse</h2>
              <p className="mt-1 text-sm text-black/50">
                Indiquez l’argent déjà dans le tiroir ce matin. Ce montant restera affiché toute la journée.
              </p>
              <label className="mt-4 block text-sm text-black/60" htmlFor="openingFloat">
                Fond d’ouverture (FCFA)
              </label>
              <input
                id="openingFloat"
                name="openingFloat"
                type="number"
                min={0}
                defaultValue={0}
                className="mt-1 rounded-xl border border-[#eee0e6] px-3 py-2"
              />
              <button className="ml-3 rounded-full bg-brown px-5 py-2 text-cream">Ouvrir la caisse</button>
            </form>
          ) : null}
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={scanMode}
                onClick={() => {
                  setScanMode((value) => !value);
                  setError(null);
                }}
                className={`rounded-full px-3 py-1 text-sm ${scanMode ? "bg-brown text-cream" : "bg-blush text-wine"}`}
              >
                Mode scan code-barres
              </button>
              {scanMode ? (
                <p className="text-xs text-black/50">Scannez, le produit s’ajoute tout seul à l’Entrée.</p>
              ) : null}
            </div>
            <input
              ref={scanRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (scanMode) onScanEnter();
                else {
                  const pick = pickExactScanMatch(results, query) ?? (results.length === 1 ? results[0] : null);
                  if (pick) {
                    add(pick);
                    setQuery("");
                  }
                }
              }}
              placeholder={scanMode ? "Scannez un code-barres puis Entrée" : "Nom, SKU ou code-barres — Entrée pour ajouter"}
              aria-busy={searching}
              className={`mt-3 w-full rounded-2xl border bg-white px-4 py-3 ${
                scanMode ? "border-gold ring-2 ring-gold/30" : "border-[#eee0e6]"
              }`}
            />
            {flash ? <p className="mt-2 text-sm text-wine">{flash}</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {results.map((variant) => {
                const qty = available(variant);
                const out = qty <= 0;
                return (
                  <button
                    type="button"
                    key={variant.id}
                    disabled={out}
                    onClick={() => add(variant)}
                    className="rounded-[1.4rem] border border-[#eee0e6] bg-white p-4 text-left hover:border-gold disabled:opacity-45"
                  >
                    {variant.product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={variant.product.images[0].url}
                        alt=""
                        loading="lazy"
                        className="mb-2 h-24 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    <p className="font-medium text-wine">{variant.product.name}</p>
                    <p className="text-sm text-black/50">
                      {variant.name} · {variant.sku}
                    </p>
                    <p className="mt-2">{formatCfa(unitPrice(variant))}</p>
                    <p className="mt-1 text-xs text-black/40">{out ? "Rupture" : `Stock ${qty}`}</p>
                  </button>
                );
              })}
            </div>
          </section>
          <aside className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-5">
            <h2 className="font-serif text-2xl text-wine">Ticket en cours</h2>
            {held.length ? (
              <ul className="mt-3 space-y-2 rounded-2xl bg-blush/60 p-3 text-sm">
                {held.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{row.note ?? "Ticket en attente"}</span>
                    <span className="flex shrink-0 gap-2">
                      <button type="button" className="underline" onClick={() => resume(row.id)}>
                        Reprendre
                      </button>
                      <button type="button" className="text-black/45 underline" onClick={() => discard(row.id)}>
                        Jeter
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="mt-4 space-y-3">
              {cart.map((line) => {
                const price = unitPrice(line.variant);
                const gross = price * line.quantity;
                return (
                  <li key={line.variant.id} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate">{line.variant.product.name}</span>
                        <span className="text-black/40">{formatCfa(price)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <button type="button" className="h-7 w-7 rounded-full border" onClick={() => setQty(line.variant.id, line.quantity - 1)}>
                          −
                        </button>
                        {line.quantity}
                        <button type="button" className="h-7 w-7 rounded-full border" onClick={() => setQty(line.variant.id, line.quantity + 1)}>
                          +
                        </button>
                      </span>
                    </div>
                    <label className="mt-1 flex items-center gap-2 text-xs text-black/50">
                      Remise ligne
                      <input
                        inputMode="numeric"
                        value={line.discount || ""}
                        onChange={(e) => setLineDiscount(line.variant.id, parseCfaInput(e.target.value))}
                        placeholder="0"
                        className="w-24 rounded-lg border border-[#eee0e6] px-2 py-1"
                      />
                      {line.discount > 0 ? <span>net {formatCfa(gross - Math.min(line.discount, gross))}</span> : null}
                    </label>
                  </li>
                );
              })}
            </ul>
            {!cart.length ? <p className="mt-4 text-sm text-black/45">Touchez un produit ou scannez un code-barres.</p> : null}
            {cart.length ? (
              <div className="mt-4 space-y-1 text-sm">
                <p className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{formatCfa(totals.subtotal)}</span>
                </p>
                <label className="flex items-center justify-between gap-2 text-black/60">
                  Remise ticket
                  <input
                    inputMode="numeric"
                    value={ticketDiscount || ""}
                    onChange={(e) => setTicketDiscount(parseCfaInput(e.target.value))}
                    placeholder="0"
                    className="w-28 rounded-lg border border-[#eee0e6] px-2 py-1 text-right"
                  />
                </label>
                {totals.discountTotal > 0 ? (
                  <p className="flex justify-between text-black/55">
                    <span>Remises</span>
                    <span>− {formatCfa(totals.discountTotal)}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="mt-3 font-serif text-3xl text-wine">{formatCfa(totals.total)}</p>
            <PosCustomerCard
              phone={customerPhone}
              name={customerName}
              selected={customer}
              onPhoneChange={setCustomerPhone}
              onNameChange={setCustomerName}
              onSelect={setCustomer}
              onClear={() => {
                setCustomer(null);
                setCustomerName("");
                setCustomerPhone("");
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {METHODS.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={mixed}
                  onClick={() => setMethod(item)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    !mixed && method === item ? "bg-brown text-cream" : "bg-blush text-wine"
                  } disabled:opacity-50`}
                >
                  {PAYMENT_LABELS[item] ?? item}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={mixed}
                onClick={() => setMixed((value) => !value)}
                className={`rounded-full px-3 py-1 text-sm ${mixed ? "bg-brown text-cream" : "bg-blush text-wine"}`}
              >
                Mixte espèces + MoMo
              </button>
            </div>
            {mixed ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="block text-sm text-black/60">
                  Espèces
                  <input
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2"
                  />
                </label>
                <label className="block text-sm text-black/60">
                  Mobile Money
                  <input
                    value={momoInput}
                    onChange={(e) => setMomoInput(e.target.value)}
                    inputMode="numeric"
                    placeholder={String(Math.max(0, totals.total - cashAmount))}
                    className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2"
                  />
                </label>
              </div>
            ) : method === "CASH" && cart.length ? (
              <label className="mt-3 block text-sm text-black/60">
                Montant reçu
                <input
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  inputMode="numeric"
                  placeholder={String(totals.total)}
                  className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2"
                />
              </label>
            ) : null}
            {pay.change > 0 ? <p className="mt-2 text-sm text-wine">Monnaie : {formatCfa(pay.change)}</p> : null}
            {pay.remaining > 0 && cart.length ? (
              <p className="mt-2 text-sm text-black/55">Reste : {formatCfa(pay.remaining)}</p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            <input
              value={heldNote}
              onChange={(e) => setHeldNote(e.target.value)}
              placeholder="Note du ticket en attente (ex. cabine)"
              className="mt-4 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!cart.length || pending}
                onClick={park}
                className="rounded-full border border-wine px-3 py-3 text-sm text-wine disabled:opacity-50"
              >
                Mettre en attente
              </button>
              <button
                type="button"
                disabled={!cart.length || pending || !openSession || pay.remaining > 0}
                onClick={checkout}
                className="rounded-full bg-brown py-3 text-cream disabled:opacity-50"
              >
                {pending ? "Encaissement…" : "Encaisser"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
      {ticket ? <ReceiptTicket data={ticket} onClose={() => setTicket(null)} /> : null}
    </div>
  );
}
