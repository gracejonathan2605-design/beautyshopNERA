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
  oftenChosen = false,
}: {
  variants: BuyVariant[];
  whatsappUrl?: string;
  oftenChosen?: boolean;
}) {
  const [id, setId] = useState(variants[0]?.id ?? "");
  const selected = variants.find((v) => v.id === id) ?? variants[0];
  if (!selected) return null;
  const available = variantAvailable(selected.inventories);
  const inStock = available > 0;
  const promo = selected.promoPrice;
  const onPromo = Boolean(promo && promo > 0 && promo < selected.salePrice);
  const price = formatCfa(unitPrice(selected));
  return (
    <div>
      <p className="mt-4 font-serif text-5xl text-brown">
        {onPromo ? (
          <span className="mr-3 font-sans text-xl text-black/30 line-through">{formatCfa(selected.salePrice)}</span>
        ) : null}
        {price}
      </p>
      {oftenChosen ? <p className="mt-2 text-sm text-wine/70">Souvent choisi cette semaine</p> : null}
      {variants.length > 1 ? (
        <div className="mt-5 flex flex-wrap gap-2" role="listbox" aria-label="Teinte ou taille">
          {variants.map((variant) => {
            const active = variant.id === selected.id;
            const gone = variantAvailable(variant.inventories) <= 0;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setId(variant.id)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm ${
                  active ? "border-wine bg-wine text-white" : "border-[#eee0e6] bg-white text-wine"
                } ${gone ? "opacity-50" : ""}`}
              >
                {variant.name}
              </button>
            );
          })}
        </div>
      ) : null}
      {inStock ? (
        <AddToCartButton action={() => addToCart(selected.id, 1)} className="mt-6 w-full rounded-full bg-brown px-8 py-3 text-cream md:w-auto" />
      ) : (
        <p className="mt-6 rounded-2xl bg-blush px-4 py-3 text-sm text-wine">
          Bientôt de retour. Cet article reste visible, vous pourrez le commander dès réapprovisionnement.
        </p>
      )}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-sm text-wine underline decoration-wine/30 underline-offset-4"
        >
          Je veux un conseil sur cette pièce
        </a>
      ) : null}
      <div className="product-buy-bar fixed inset-x-0 z-30 border-t border-[#eee0e6] bg-white/95 p-3 md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="font-serif text-2xl text-brown">{price}</p>
          {inStock ? (
            <AddToCartButton action={() => addToCart(selected.id, 1)} className="rounded-full bg-brown px-5 py-3 text-sm text-cream" />
          ) : (
            <p className="text-sm text-wine">Bientôt de retour</p>
          )}
        </div>
      </div>
    </div>
  );
}
