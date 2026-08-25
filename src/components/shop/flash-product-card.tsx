"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { addToCart } from "@/app/actions/shop";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { FlashCountdown } from "@/components/shop/flash-countdown";
import { ProductBadges } from "@/components/shop/product-badges";
import { formatCfa } from "@/lib/money";
import { promoPercent, unitPrice } from "@/lib/pricing";
import { catalogPhotoFor } from "@/lib/product-photos";
import { displayVariant, productInStock } from "@/lib/stock-display";
import { isFlashActive } from "@/lib/flash";

export type FlashCardProduct = {
  name: string;
  slug: string;
  shortDescription: string | null;
  isNew?: boolean;
  isPromo?: boolean;
  status: string;
  onlineVisible: boolean;
  deletedAt?: Date | string | null;
  flashStartAt?: Date | string | null;
  flashEndAt?: Date | string | null;
  variants: {
    id?: string;
    salePrice: number;
    promoPrice: number | null;
    inventories?: { onHand: number; reserved: number }[];
  }[];
  images?: { url: string; alt: string | null }[];
};

export function FlashProductCard({ product }: { product: FlashCardProduct }) {
  const [gone, setGone] = useState(false);
  const flash = !gone && isFlashActive(product);
  if (!flash || !product.flashEndAt) return null;

  const variant = displayVariant(product.variants);
  const price = variant ? unitPrice(variant) : 0;
  const percent = variant ? promoPercent(variant.salePrice, variant.promoPrice) : 0;
  const onPromo = percent > 0;
  const inStock = productInStock(product.variants);
  const photo = product.images?.[0]?.url ?? catalogPhotoFor(product.slug, product.name);
  const photoAlt = product.images?.[0]?.alt ?? product.name;
  const variantId = variant?.id;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-[#eee0e6] bg-white shadow-[0_18px_40px_-32px_rgba(58,36,48,0.28)]">
      <Link href={`/produit/${product.slug}`} className="relative aspect-4/5 overflow-hidden bg-linear-to-br from-blush to-champagne">
        <Image
          src={photo}
          alt={photoAlt}
          fill
          className={`object-cover ${inStock ? "" : "grayscale-[0.35]"}`}
          sizes="(max-width: 768px) 80vw, 25vw"
        />
        <div className="absolute left-3 top-3">
          <ProductBadges flash promoPercent={percent} isPromo={product.isPromo} isNew={product.isNew} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/produit/${product.slug}`}>
          <h3 className="font-serif text-xl leading-snug text-wine">{product.name}</h3>
        </Link>
        <p className="mt-3 text-sm font-medium text-wine">
          {onPromo && variant ? (
            <span className="mr-2 text-black/30 line-through">{formatCfa(variant.salePrice)}</span>
          ) : null}
          {formatCfa(price)}
        </p>
        <FlashCountdown endAt={product.flashEndAt} onExpired={() => setGone(true)} />
        <div className="mt-auto flex flex-col gap-2 pt-3">
          {inStock && variantId ? (
            <AddToCartButton
              action={() => addToCart(variantId, 1)}
              label="Ajouter au panier"
              className="mt-0 w-full rounded-full bg-brown py-2.5 text-sm text-cream"
            />
          ) : (
            <p className="text-xs text-black/45">Bientôt de retour</p>
          )}
          <Link
            href={`/produit/${product.slug}`}
            className="rounded-full border border-[#eee0e6] py-2.5 text-center text-sm text-wine"
          >
            Voir le produit
          </Link>
        </div>
      </div>
    </article>
  );
}
