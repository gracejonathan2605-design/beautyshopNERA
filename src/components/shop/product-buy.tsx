"use client";

import { useState } from "react";
import { addToCart } from "@/app/actions/shop";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";

type BuyVariant = {
  id: string;
  name: string;
  salePrice: number;
  promoPrice: number | null;
};

export function ProductBuy({
  variants,
  whatsappUrl,
}: {
  variants: BuyVariant[];
  whatsappUrl?: string;
}) {
  const [id, setId] = useState(variants[0]?.id ?? "");
  const selected = variants.find((v) => v.id === id) ?? variants[0];
  if (!selected) return null;
  return (
    <div>
      {variants.length > 1 ? (
        <label className="mt-6 block text-sm">
          <span className="text-black/50">Variante</span>
          <select
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {formatCfa(unitPrice(v))}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="mt-6 font-serif text-4xl">{formatCfa(unitPrice(selected))}</p>
      <AddToCartButton action={() => addToCart(selected.id, 1)} />
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-full border border-[#25D366] py-3 text-center text-sm text-[#128C46]"
        >
          Commander sur WhatsApp
        </a>
      ) : null}
    </div>
  );
}
