"use client";

import { useState } from "react";
import { addToCart } from "@/app/actions/shop";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { variantAvailable } from "@/lib/stock-display";

type BuyVariant = {
  id: string;
  name: string;
  salePrice: number;
  promoPrice: number | null;
  inventories?: { onHand: number; reserved: number }[];
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
  const available = variantAvailable(selected.inventories);
  const inStock = available > 0;
  const promo = selected.promoPrice;
  const onPromo = Boolean(promo && promo > 0 && promo < selected.salePrice);
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
                {variantAvailable(v.inventories) <= 0 ? " — bientôt de retour" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="mt-6 font-serif text-4xl">
        {onPromo ? (
          <span className="mr-3 font-sans text-xl text-black/30 line-through">{formatCfa(selected.salePrice)}</span>
        ) : null}
        {formatCfa(unitPrice(selected))}
      </p>
      {inStock ? (
        <AddToCartButton action={() => addToCart(selected.id, 1)} />
      ) : (
        <p className="mt-8 rounded-2xl bg-blush px-4 py-3 text-sm text-wine">
          Bientôt de retour. Cet article n’est plus en stock — il reste visible, vous pourrez le commander dès
          réapprovisionnement.
        </p>
      )}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-full border border-[#25D366] py-3 text-center text-sm text-[#128C46]"
        >
          {inStock ? "Commander sur WhatsApp" : "Demander le retour en stock sur WhatsApp"}
        </a>
      ) : null}
    </div>
  );
}
