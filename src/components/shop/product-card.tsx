import Link from "next/link";
import { formatCfa } from "@/lib/money";
import { promoPercent, unitPrice } from "@/lib/pricing";
import { ProductPhoto } from "@/components/shop/product-photo";
import { shopProductImage } from "@/lib/product-photos";
import { displayVariant, productInStock } from "@/lib/stock-display";
import { isFlashActive } from "@/lib/flash";
import { PRODUCT_CARD_SIZES, SHOP_IMAGE_QUALITY } from "@/lib/image-limits";
import { ProductBadges } from "@/components/shop/product-badges";
import { ProductCardFlash } from "@/components/shop/product-card-flash";

export function ProductCard({
  product,
  oftenChosen = false,
}: {
  oftenChosen?: boolean;
  product: {
    name: string;
    slug: string;
    shortDescription: string | null;
    isNew?: boolean;
    isPromo?: boolean;
    status?: string;
    onlineVisible?: boolean;
    deletedAt?: Date | string | null;
    flashStartAt?: Date | string | null;
    flashEndAt?: Date | string | null;
    variants: {
      salePrice: number;
      promoPrice: number | null;
      inventories?: { onHand: number; reserved: number }[];
    }[];
    images?: { url: string; alt: string | null }[];
    brand?: { name: string; slug: string; isPartner?: boolean; showOnSite?: boolean } | null;
  };
}) {
  const variant = displayVariant(product.variants);
  const price = variant ? unitPrice(variant) : 0;
  const percent = variant ? promoPercent(variant.salePrice, variant.promoPrice) : 0;
  const onPromo = percent > 0;
  const inStock = productInStock(product.variants);
  const photo = shopProductImage(product.slug, product.images?.[0]?.url, product.name);
  const photoAlt = product.images?.[0]?.alt ?? product.name;
  const flash = isFlashActive({
    status: product.status ?? "ACTIVE",
    onlineVisible: product.onlineVisible ?? true,
    deletedAt: product.deletedAt,
    flashStartAt: product.flashStartAt,
    flashEndAt: product.flashEndAt,
  });
  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group overflow-hidden rounded-[1.7rem] border border-[#eee0e6] bg-white shadow-[0_18px_40px_-32px_rgba(58,36,48,0.28)] transition hover:-translate-y-0.5 hover:border-gold/50"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-linear-to-br from-blush to-champagne">
        <ProductPhoto
          src={photo}
          alt={photoAlt}
          className={`object-cover transition duration-500 group-hover:scale-105 ${inStock ? "" : "grayscale-[0.35]"}`}
          sizes={PRODUCT_CARD_SIZES}
          quality={SHOP_IMAGE_QUALITY}
        />
        <div className="absolute left-3 top-3">
          <ProductBadges flash={flash} promoPercent={percent} isPromo={product.isPromo} isNew={product.isNew} />
        </div>
        {!inStock ? (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-wine/90 px-3 py-2 text-center text-[11px] uppercase tracking-[0.14em] text-white">
            Bientôt de retour
          </span>
        ) : null}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 font-serif text-base leading-snug text-wine sm:text-xl">{product.name}</h3>
        {product.brand?.name ? (
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/40">{product.brand.name}</p>
        ) : null}
        <p className="mt-1 line-clamp-2 text-xs text-black/50 sm:text-sm max-sm:hidden">{product.shortDescription}</p>
        {oftenChosen ? (
          <p className="mt-2 text-xs text-wine/70">Souvent choisi cette semaine</p>
        ) : null}
        <p className="mt-2 font-serif text-lg text-brown sm:mt-3 sm:text-2xl">
          {onPromo && variant ? (
            <span className="mr-2 text-black/30 line-through">{formatCfa(variant.salePrice)}</span>
          ) : null}
          {formatCfa(price)}
        </p>
        {flash && product.flashEndAt ? <ProductCardFlash endAt={product.flashEndAt} /> : null}
        {!inStock ? <p className="mt-1 text-xs text-black/45">Indisponible pour le moment</p> : null}
      </div>
    </Link>
  );
}
