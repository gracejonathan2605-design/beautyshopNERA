import Image from "next/image";
import Link from "next/link";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { catalogPhotoFor } from "@/lib/product-photos";
import { displayVariant, productInStock } from "@/lib/stock-display";

export function ProductCard({
  product,
}: {
  product: {
    name: string;
    slug: string;
    shortDescription: string | null;
    isNew?: boolean;
    isPromo?: boolean;
    variants: {
      salePrice: number;
      promoPrice: number | null;
      inventories?: { onHand: number; reserved: number }[];
    }[];
    images?: { url: string; alt: string | null }[];
  };
}) {
  const variant = displayVariant(product.variants);
  const price = variant ? unitPrice(variant) : 0;
  const promo = variant?.promoPrice;
  const onPromo = Boolean(promo && promo > 0 && promo < (variant?.salePrice ?? 0));
  const inStock = productInStock(product.variants);
  const photo = product.images?.[0]?.url ?? catalogPhotoFor(product.slug, product.name);
  const photoAlt = product.images?.[0]?.alt ?? product.name;
  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group overflow-hidden rounded-[1.7rem] border border-[#eee0e6] bg-white shadow-[0_18px_40px_-32px_rgba(58,36,48,0.28)] transition hover:-translate-y-0.5 hover:border-gold/50"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-linear-to-br from-blush to-champagne">
        <Image
          src={photo}
          alt={photoAlt}
          fill
          className={`object-cover transition duration-500 group-hover:scale-105 ${inStock ? "" : "grayscale-[0.35]"}`}
          sizes="(max-width: 768px) 100vw, 25vw"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {onPromo || product.isPromo ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-brown">
              Promo
            </span>
          ) : product.isNew ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-wine">
              Nouveau
            </span>
          ) : null}
        </div>
        {!inStock ? (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-wine/90 px-3 py-2 text-center text-[11px] uppercase tracking-[0.14em] text-white">
            Bientôt de retour
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="font-serif text-xl leading-snug text-wine">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-black/50">{product.shortDescription}</p>
        <p className="mt-3 text-sm font-medium text-wine">
          {onPromo && variant ? (
            <span className="mr-2 text-black/30 line-through">{formatCfa(variant.salePrice)}</span>
          ) : null}
          {formatCfa(price)}
        </p>
        {!inStock ? <p className="mt-1 text-xs text-black/45">Indisponible pour le moment</p> : null}
      </div>
    </Link>
  );
}
