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
  };
}) {
  const price = product.variants[0] ? unitPrice(product.variants[0]) : 0;
  const promo = product.variants[0]?.promoPrice;
  return (
    <Link href={`/produit/${product.slug}`} className="group overflow-hidden rounded-3xl bg-cream shadow-sm">
      <div className="flex h-48 items-end bg-linear-to-br from-[#e8dcc8] to-[#c4a574] p-4">
        <span className="font-serif text-2xl text-brown">{product.name}</span>
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
