import Image from "next/image";
import Link from "next/link";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";

export function ProductCard({
  product,
}: {
  product: {
    name: string;
    slug: string;
    shortDescription: string | null;
    variants: { salePrice: number; promoPrice: number | null }[];
    images?: { url: string; alt: string | null }[];
  };
}) {
  const price = product.variants[0] ? unitPrice(product.variants[0]) : 0;
  const promo = product.variants[0]?.promoPrice;
  const image = product.images?.[0];
  return (
    <Link href={`/produit/${product.slug}`} className="group overflow-hidden rounded-3xl bg-cream shadow-sm">
      <div className="relative flex h-48 items-end overflow-hidden bg-linear-to-br from-[#e8dcc8] to-[#c4a574] p-4">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        ) : null}
        <span className="relative font-serif text-2xl text-brown drop-shadow-sm">{product.name}</span>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-sm text-black/60">{product.shortDescription}</p>
        <p className="mt-3 font-medium">
          {promo ? <span className="mr-2 text-black/40 line-through">{formatCfa(product.variants[0].salePrice)}</span> : null}
          {formatCfa(price)}
        </p>
      </div>
    </Link>
  );
}
