"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCfa, parseCfaInput } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import {
  browsePosProducts,
  discardHeldTicket,
  openRegister,
  closeRegister,
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
import { PendingSubmitButton } from "@/components/admin/form-pending";
import {
  buildCheckoutPayments,
  isValidSaleUnitPrice,
  pickSearchEnterMatch,
  ticketTotals,
  type HeldTicketPayload,
  type PosCategory,
  type PosVariant,
} from "@/lib/pos";

type Line = { variant: PosVariant; quantity: number; unitPrice: number; discount: number };

const METHODS: PaymentMethod[] = ["CASH", "MOBILE_MONEY", "CARD", "OTHER"];

export function PosClient({
  initial,
  categories,
  openSession,
  occupiedBy,
  occupiedSessionId,
  canForceClose,
  suggestedOpeningFloat,
  shop,
  canRefund,
  initialHeld,
}: {
  initial: { items: PosVariant[]; hasMore: boolean };
  categories: PosCategory[];
  openSession: { id: string; openingFloat: number; openedByName?: string } | null;
  occupiedBy?: string | null;
  occupiedSessionId?: string | null;
  canForceClose?: boolean;
  suggestedOpeningFloat?: number;
  shop: ReceiptShop;
  canRefund: boolean;
  initialHeld: HeldTicketRow[];
}) {
  const router = useRouter();
  const scanRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"vente" | "retour">("vente");
  const [scanMode, setScanMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial.items);
  const [resultsForQuery, setResultsForQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [browsePage, setBrowsePage] = useState(0);
  const [resultsForBrowse, setResultsForBrowse] = useState<{ categoryId: string | null; page: number }>({
    categoryId: null,
    page: 0,
  });
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchAttempt, setSearchAttempt] = useState(0);
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
  const resumedHeldTicketId = useRef<string | null>(null);
  const [heldNote, setHeldNote] = useState("");
  const [ticket, setTicket] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [searching, startSearch] = useTransition();
  const browsing = !query.trim();
  const currentResults =
    resultsForQuery === query &&
    (!browsing || (resultsForBrowse.categoryId === categoryId && resultsForBrowse.page === browsePage));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const rootCategories = categories.filter((category) => !category.parentId || !categoryById.has(category.parentId));
  const categoryPath: PosCategory[] = [];
  const visited = new Set<string>();
  let pathId = categoryId;
  while (pathId && !visited.has(pathId)) {
    visited.add(pathId);
    const category = categoryById.get(pathId);
    if (!category) break;
    categoryPath.unshift(category);
    pathId = category.parentId;
  }
  const subcategories = categories.filter((category) => category.parentId === categoryId && categoryId !== null);

  const totals = useMemo(
    () =>
      ticketTotals(
        cart.map((line) => ({
          unitPrice: line.unitPrice,
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
    let cancelled = false;
    const timer = window.setTimeout(() => {
      startSearch(async () => {
        const q = query;
        try {
          if (!q.trim()) {
            const found = await browsePosProducts(categoryId, browsePage);
            if (cancelled) return;
            setResults(found.items);
            setHasMore(found.hasMore);
            setResultsForBrowse({ categoryId, page: browsePage });
          } else {
            const found = await searchPosProducts(q);
            if (cancelled) return;
            setResults(found);
          }
          if (cancelled) return;
          setResultsForQuery(q);
          setSearchError(null);
        } catch {
          if (!cancelled) setSearchError("Recherche indisponible. Réessayez en modifiant la recherche.");
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, scanMode, initial, categoryId, browsePage, searchAttempt]);

  function selectCategory(id: string | null) {
    setScanMode(false);
    setQuery("");
    setCategoryId(id);
    setBrowsePage(0);
    setSearchError(null);
  }

  function available(variant: PosVariant) {
    return variant.inventories.reduce((sum, row) => sum + (row.onHand - row.reserved), 0);
  }

  function add(variant: PosVariant) {
    const max = available(variant);
    if (max <= 0) {
      setError(`Rupture : ${variant.product.name}`);
      return;
    }
    setError(null);
    let blocked = false;
    setCart((current) => {
      const existing = current.find((line) => line.variant.id === variant.id);
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (nextQty > max) {
        blocked = true;
        return current;
      }
      if (existing) {
        return current.map((line) =>
          line.variant.id === variant.id ? { ...line, quantity: nextQty } : line,
        );
      }
      return [...current, { variant, quantity: 1, unitPrice: unitPrice(variant), discount: 0 }];
    });
    if (blocked) {
      setError(`Stock max atteint (${max}) pour ${variant.product.name}`);
      return;
    }
    setFlash(`${variant.product.name} ajouté`);
  }

  function setQty(variantId: string, quantity: number) {
    setCart((current) => {
      const line = current.find((item) => item.variant.id === variantId);
      if (!line) return current;
      const max = available(line.variant);
      const qty = Math.min(Math.max(0, Math.floor(Number(quantity) || 0)), max);
      if (qty <= 0) return current.filter((item) => item.variant.id !== variantId);
      return current.map((item) => (item.variant.id === variantId ? { ...item, quantity: qty } : item));
    });
  }

  function setLineDiscount(variantId: string, discount: number) {
    setCart((current) =>
      current.map((line) => (line.variant.id === variantId ? { ...line, discount } : line)),
    );
  }

  function setLinePrice(variantId: string, price: number) {
    setCart((current) =>
      current.map((line) => (line.variant.id === variantId ? { ...line, unitPrice: price } : line)),
    );
  }

  function currentPayload(): HeldTicketPayload {
    return {
      lines: cart,
      ticketDiscount,
      customerId: customer?.id,
      customerPhone,
      customerName,
      mixed,
      method,
    };
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
    resumedHeldTicketId.current = null;
  }

  function onScanEnter() {
    const code = query.trim();
    if (!code || pending) return;
    setError(null);
    start(async () => {
      try {
        const scanned = await scanPosBarcode(code);
        if (scanned.ok) {
          add(scanned.variant);
          setQuery("");
          scanRef.current?.focus();
          return;
        }
        setError(scanned.error);
      } catch {
        setError("Scan indisponible. Vérifiez la connexion puis réessayez.");
      }
    });
  }

  function checkout() {
    if (!cart.length || pending) return;
    if (!openSession) {
      setError("Ouvrez d’abord la caisse (fond du tiroir).");
      return;
    }
    if (cart.some((line) => !isValidSaleUnitPrice(line.unitPrice))) {
      setError("Indiquez un prix de vente valide pour chaque produit.");
      return;
    }
    if (pay.remaining > 0) {
      setError(`Il reste ${formatCfa(pay.remaining)} à encaisser.`);
      return;
    }
    if (!pay.payments.length && totals.total > 0) {
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
            unitPrice: line.unitPrice,
            discount: line.discount || undefined,
          })),
          payments: pay.payments,
          discount: totals.cartDiscount || undefined,
          customerId: customer?.id,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          heldTicketId: resumedHeldTicketId.current || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const receipt = saleToReceipt(result.sale, shop);
        if (customerPhone) receipt.customerPhone = customerPhone;
        receipt.change = pay.change;
        if (method === "CASH" || mixed) {
          const cashLine = pay.payments.find((row) => row.method === "CASH");
          if (cashLine) receipt.cashReceived = cashLine.amount;
        }
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
        heldTicketId: resumedHeldTicketId.current || undefined,
        payload: currentPayload(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHeld((current) => [result.ticket, ...current.filter((row) => row.id !== result.ticket.id)]);
      clearTicket();
      setFlash("Ticket mis en attente");
    });
  }

  function resume(id: string) {
    if (cart.length && !confirm("Remplacer le ticket en cours par celui en attente ?")) return;
    setError(null);
    start(async () => {
      const currentResumedId = resumedHeldTicketId.current;
      let restored: HeldTicketRow | null = null;
      if (currentResumedId && cart.length && currentResumedId !== id) {
        const parked = await parkPosTicket({
          heldTicketId: currentResumedId,
          note: heldNote,
          payload: currentPayload(),
        });
        if (!parked.ok) {
          setError(parked.error);
          return;
        }
        restored = parked.ticket;
      }
      const result = await resumeHeldTicket(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      resumedHeldTicketId.current = result.ticket.id;
      const payload = result.ticket.payload;
      setCart(
        (payload.lines ?? []).map((line) => ({
          ...line,
          unitPrice: line.unitPrice ?? unitPrice(line.variant),
        })),
      );
      setTicketDiscount(payload.ticketDiscount ?? 0);
      setCustomerName(payload.customerName ?? "");
      setCustomerPhone(payload.customerPhone ?? "");
      setCustomer(payload.customerId ? { id: payload.customerId, code: "", firstName: payload.customerName || "Cliente", lastName: "", phone: payload.customerPhone || null, totalSpent: 0, sales: [] } : null);
      setMixed(Boolean(payload.mixed));
      setMethod(payload.method ?? "CASH");
      setHeld((current) => {
        const withoutB = current.filter((row) => row.id !== id);
        if (restored && !withoutB.some((row) => row.id === restored.id)) {
          return [restored, ...withoutB];
        }
        return withoutB;
      });
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
          {!openSession && occupiedBy ? (
            <div className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-6 lg:col-span-2">
              <h2 className="font-serif text-2xl text-wine">Caisse déjà ouverte</h2>
              <p className="mt-2 text-sm text-black/60">
                Caisse ouverte par <strong>{occupiedBy}</strong>. Une caisse = une vendeuse à la fois. Elle peut la
                fermer à tout moment, puis vous pourrez ouvrir la vôtre.
              </p>
              {canForceClose && occupiedSessionId ? (
                <form action={closeRegister} className="mt-4">
                  <input type="hidden" name="sessionId" value={occupiedSessionId} />
                  <PendingSubmitButton
                    idle="Fermer cette caisse"
                    pendingLabel="Fermeture…"
                    className="rounded-full bg-wine px-5 py-2 text-cream disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </form>
              ) : null}
            </div>
          ) : !openSession ? (
            <form action={openRegister} className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-6 lg:col-span-2">
              <h2 className="font-serif text-2xl text-wine">Ouvrir la caisse</h2>
              <p className="mt-1 text-sm text-black/50">
                Indiquez l’argent déjà dans le tiroir. Vous pouvez ouvrir et fermer autant de fois que besoin dans la
                journée (pause, relais, fin de service).
              </p>
              <label className="mt-4 block text-sm text-black/60" htmlFor="openingFloat">
                Fond d’ouverture (FCFA)
              </label>
              <input
                id="openingFloat"
                name="openingFloat"
                inputMode="numeric"
                defaultValue={suggestedOpeningFloat ?? 0}
                placeholder="ex. 10000 ou 10.000"
                className="mt-1 rounded-xl border border-[#eee0e6] px-3 py-2"
              />
              <PendingSubmitButton
                idle="Ouvrir la caisse"
                pendingLabel="Ouverture…"
                className="ml-3 rounded-full bg-brown px-5 py-2 text-cream disabled:cursor-not-allowed disabled:opacity-60"
              />
            </form>
          ) : null}
          <section>
            <h2 className="font-serif text-2xl text-wine">Rayons</h2>
            <p className="mt-1 text-sm text-black/55">Choisissez un rayon pour voir ses articles et ses sous-rayons.</p>
            <nav aria-label="Rayons de la caisse" className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={categoryId === null && !query.trim()}
                onClick={() => selectCategory(null)}
                className={`rounded-full px-3 py-2 text-sm ${categoryId === null && !query.trim() ? "bg-brown text-cream" : "bg-blush text-wine"}`}
              >
                Tous les articles
              </button>
              {rootCategories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  aria-pressed={categoryPath[0]?.id === category.id && !query.trim()}
                  onClick={() => selectCategory(category.id)}
                  className={`rounded-full px-3 py-2 text-sm ${categoryPath[0]?.id === category.id && !query.trim() ? "bg-brown text-cream" : "bg-blush text-wine"}`}
                >
                  {category.name}
                </button>
              ))}
            </nav>
            {categoryPath.length > 0 && !query.trim() ? (
              <div className="mt-3">
                <nav aria-label="Rayon sélectionné" className="flex flex-wrap items-center gap-2 text-sm">
                  {categoryPath.map((category, index) => (
                    <span key={category.id}>
                      {index > 0 ? " / " : ""}
                      <button type="button" className="text-wine underline" onClick={() => selectCategory(category.id)}>
                        {category.name}
                      </button>
                    </span>
                  ))}
                </nav>
                {subcategories.length ? (
                  <nav aria-label="Sous-rayons de la caisse" className="mt-2 flex flex-wrap gap-2">
                    {subcategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => selectCategory(category.id)}
                        className="rounded-full border border-wine/30 px-3 py-1 text-sm text-wine"
                      >
                        {category.name}
                      </button>
                    ))}
                  </nav>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
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
              onChange={(e) => {
                setQuery(e.target.value);
                if (!scanMode && e.target.value.trim()) {
                  setCategoryId(null);
                  setBrowsePage(0);
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (scanMode) onScanEnter();
                else {
                  if (searching || searchError) return;
                  const pick = pickSearchEnterMatch(results, query, resultsForQuery);
                  if (pick) {
                    add(pick);
                    setQuery("");
                  }
                }
              }}
              placeholder={scanMode ? "Scannez un code-barres puis Entrée" : "Nom, SKU ou code-barres — Entrée pour ajouter"}
              aria-label={scanMode ? "Scanner un code-barres" : "Rechercher un produit par nom, référence ou code-barres"}
              aria-busy={searching}
              className={`mt-3 w-full rounded-2xl border bg-white px-4 py-3 ${
                scanMode ? "border-gold ring-2 ring-gold/30" : "border-[#eee0e6]"
              }`}
            />
            {!scanMode ? (
              <p className="mt-2 text-xs text-black/50">
                La recherche porte sur tous les rayons : nom, référence ou partie du code-barres. Touchez un article pour l’ajouter.
              </p>
            ) : null}
            {!scanMode && searchError ? (
              <div className="mt-2 text-sm text-red-800" role="alert">
                <p>{searchError}</p>
                <button
                  type="button"
                  className="mt-1 underline"
                  onClick={() => {
                    setSearchError(null);
                    setSearchAttempt((attempt) => attempt + 1);
                  }}
                >
                  Réessayer
                </button>
              </div>
            ) : null}
            {!scanMode && !searchError && (searching || !currentResults) ? (
              <p className="mt-2 text-sm text-black/55" role="status">Chargement des articles…</p>
            ) : null}
            {!scanMode && !searchError && currentResults && !searching && results.length === 0 ? (
              <p className="mt-2 text-sm text-black/55" role="status">
                {browsing ? "Aucun article dans ce rayon." : "Aucun produit trouvé. Essayez une autre référence ou un autre nom."}
              </p>
            ) : null}
            {!scanMode && !browsing && currentResults && results.length === 30 ? (
              <p className="mt-2 text-xs text-black/50">30 résultats affichés au maximum. Précisez la recherche si nécessaire.</p>
            ) : null}
            {flash ? <p className="mt-2 text-sm text-wine">{flash}</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(!scanMode && !searchError && currentResults ? results : []).map((variant) => {
                const qty = available(variant);
                const out = qty <= 0;
                const photo = variant.images?.[0] ?? variant.product.images?.[0];
                return (
                  <button
                    type="button"
                    key={variant.id}
                    disabled={out}
                    onClick={() => add(variant)}
                    className="rounded-[1.4rem] border border-[#eee0e6] bg-white p-4 text-left hover:border-gold disabled:opacity-45"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt=""
                        loading="lazy"
                        className="mb-2 h-24 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="mb-2 flex h-24 items-center justify-center rounded-xl bg-blush text-xs text-black/45">Sans photo</div>
                    )}
                    <p className="font-medium text-wine">{variant.product.name}</p>
                    <p className="text-sm text-black/50">
                      {variant.name} · Réf. {variant.sku}
                    </p>
                    {variant.barcode ? <p className="mt-1 text-xs text-black/50">Code-barres : {variant.barcode}</p> : null}
                    <p className="mt-2">{formatCfa(unitPrice(variant))}</p>
                    <p className="mt-1 text-xs text-black/40">{out ? "Rupture" : `Stock ${qty}`}</p>
                  </button>
                );
              })}
            </div>
            {!scanMode && browsing && !searchError && currentResults && (browsePage > 0 || hasMore) ? (
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={browsePage === 0 || searching}
                  onClick={() => setBrowsePage((page) => page - 1)}
                  className="rounded-full border border-wine px-4 py-2 text-sm text-wine disabled:opacity-40"
                >
                  Précédent
                </button>
                <span className="text-sm text-black/55">Page {browsePage + 1}</span>
                <button
                  type="button"
                  disabled={!hasMore || searching}
                  onClick={() => setBrowsePage((page) => page + 1)}
                  className="rounded-full bg-brown px-4 py-2 text-sm text-cream disabled:opacity-40"
                >
                  Voir les articles suivants
                </button>
              </div>
            ) : null}
          </section>
          <aside className="rounded-[1.7rem] border border-[#eee0e6] bg-white p-5">
            <h2 className="font-serif text-2xl text-wine">Ticket en cours</h2>
            {openSession?.openedByName ? (
              <p className="mt-1 text-sm font-medium text-wine">Caisse ouverte par {openSession.openedByName}</p>
            ) : null}
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
                const gross = line.unitPrice * line.quantity;
                return (
                  <li key={line.variant.id} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate">{line.variant.product.name}</span>
                        <span className="text-black/40">Prix indicatif : {formatCfa(unitPrice(line.variant))}</span>
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
                      Prix de vente (FCFA)
                      <input
                        inputMode="numeric"
                        value={line.unitPrice || ""}
                        onChange={(e) => setLinePrice(line.variant.id, parseCfaInput(e.target.value))}
                        placeholder="0"
                        aria-label={`Prix de vente de ${line.variant.product.name}`}
                        className="w-28 rounded-lg border border-[#eee0e6] px-2 py-1"
                      />
                    </label>
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
