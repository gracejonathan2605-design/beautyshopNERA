"use client";

import { useState, useTransition } from "react";
import { formatCfa } from "@/lib/money";
import { createPosCustomer, searchPosCustomer } from "@/app/actions/pos";
import { SALE_STATUS_LABELS } from "@/lib/status-labels";

export type PosCustomerCardData = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  totalSpent: number;
  sales: {
    id: string;
    number: string;
    total: number;
    status: string;
    createdAt: Date | string;
    items: { productName: string; quantity: number }[];
  }[];
};

function formatWhen(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function PosCustomerCard({
  phone,
  name,
  selected,
  onPhoneChange,
  onNameChange,
  onSelect,
  onClear,
}: {
  phone: string;
  name: string;
  selected: PosCustomerCardData | null;
  onPhoneChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSelect: (customer: PosCustomerCardData) => void;
  onClear: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [searchedEmpty, setSearchedEmpty] = useState(false);
  const [pending, start] = useTransition();

  function lookup() {
    const q = phone.trim();
    if (!q) {
      setError("Indiquez un numéro WhatsApp.");
      return;
    }
    setError(null);
    start(async () => {
      const found = await searchPosCustomer(q);
      if (!found) {
        setSearchedEmpty(true);
        return;
      }
      setSearchedEmpty(false);
      onSelect(found);
      onNameChange(`${found.firstName} ${found.lastName}`.trim());
      if (found.phone) onPhoneChange(found.phone);
    });
  }

  function create() {
    const first = name.trim().split(/\s+/)[0];
    const last = name.trim().split(/\s+/).slice(1).join(" ");
    if (!first) {
      setError("Indiquez le prénom pour créer la fiche.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await createPosCustomer({ firstName: first, lastName: last, phone: phone.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSearchedEmpty(false);
      onSelect({ ...result.customer, sales: [] });
    });
  }

  if (selected) {
    return (
      <div className="mt-4 rounded-2xl border border-[#eee0e6] bg-blush/50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-wine">
              {selected.firstName} {selected.lastName}
            </p>
            <p className="text-xs text-black/50">
              {selected.code}
              {selected.phone ? ` · ${selected.phone}` : ""} · {formatCfa(selected.totalSpent)}
            </p>
          </div>
          <button type="button" className="text-xs underline" onClick={onClear}>
            Retirer
          </button>
        </div>
        {selected.sales.length ? (
          <ul className="mt-2 space-y-1 text-xs text-black/55">
            {selected.sales.map((sale) => (
              <li key={sale.id} className="flex justify-between gap-2">
                <span>
                  {sale.number} · {formatWhen(sale.createdAt)} · {SALE_STATUS_LABELS[sale.status as keyof typeof SALE_STATUS_LABELS] ?? sale.status}
                </span>
                <span>{formatCfa(sale.total)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-black/45">Aucun achat encore.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label className="block text-sm text-black/60" htmlFor="pos-customer-phone">
        Fiche cliente — rechercher par téléphone
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="pos-customer-phone"
          value={phone}
          onChange={(e) => {
            onPhoneChange(e.target.value);
            setSearchedEmpty(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lookup();
            }
          }}
          inputMode="tel"
          placeholder="6XX XX XX XX"
          className="w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={pending}
          className="shrink-0 rounded-full bg-blush px-3 py-2 text-sm text-wine"
        >
          {pending ? "…" : "Chercher"}
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Nom (pour créer une nouvelle fiche)"
        className="mt-2 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
      />
      {searchedEmpty ? (
        <div className="mt-2 rounded-xl border border-[#eee0e6] bg-white px-3 py-2 text-sm">
          <p className="text-black/60">Aucune fiche pour ce numéro.</p>
          <button type="button" onClick={create} disabled={pending} className="mt-1 text-sm text-wine underline">
            Créer la fiche
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
