"use client";

import { useState } from "react";

type Row = {
  name: string;
  salePrice: string;
  promoPrice: string;
  costPrice: string;
  barcode: string;
  stock: string;
};

const EMPTY: Row = { name: "Standard", salePrice: "", promoPrice: "", costPrice: "", barcode: "", stock: "" };

export function VariantEditor() {
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }]);

  function update(index: number, key: keyof Row, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div className="space-y-3 md:col-span-4">
      <p className="text-sm text-black/55">
        Variantes (couleur, longueur, pointure…). La première est la variante par défaut. SKU automatique.
      </p>
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 rounded-2xl border border-[#eee0e6] bg-white p-3 md:grid-cols-6">
          <input
            name="variantName"
            value={row.name}
            onChange={(e) => update(index, "name", e.target.value)}
            placeholder={index === 0 ? "Standard" : "ex. Noir / 30 cm"}
            className="rounded-xl border px-3 py-2"
          />
          <input
            name="variantSalePrice"
            inputMode="numeric"
            required={index === 0}
            value={row.salePrice}
            onChange={(e) => update(index, "salePrice", e.target.value)}
            placeholder="Prix vente"
            className="rounded-xl border px-3 py-2"
          />
          <input
            name="variantPromoPrice"
            inputMode="numeric"
            value={row.promoPrice}
            onChange={(e) => update(index, "promoPrice", e.target.value)}
            placeholder="Prix promo"
            className="rounded-xl border px-3 py-2"
          />
          <input
            name="variantCostPrice"
            inputMode="numeric"
            value={row.costPrice}
            onChange={(e) => update(index, "costPrice", e.target.value)}
            placeholder="Prix achat"
            className="rounded-xl border px-3 py-2"
          />
          <input
            name="variantBarcode"
            value={row.barcode}
            onChange={(e) => update(index, "barcode", e.target.value)}
            placeholder="Code-barres"
            className="rounded-xl border px-3 py-2"
          />
          <div className="flex gap-2">
            <input
              name="variantStock"
              inputMode="numeric"
              value={row.stock}
              onChange={(e) => update(index, "stock", e.target.value)}
              placeholder="Stock"
              className="w-full rounded-xl border px-3 py-2"
            />
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                className="shrink-0 rounded-xl border px-2 text-xs text-black/50"
                aria-label="Retirer la variante"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((current) => [...current, { ...EMPTY, name: "" }])}
        className="rounded-full border border-[#eee0e6] bg-white px-4 py-2 text-sm"
      >
        Ajouter une variante
      </button>
    </div>
  );
}
