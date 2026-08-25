import Link from "next/link";
import { FlashProductCard, type FlashCardProduct } from "@/components/shop/flash-product-card";

export function FlashSection({ products }: { products: FlashCardProduct[] }) {
  if (!products.length) return null;
  return (
    <section className="border-y border-[#f0e4ea] bg-[linear-gradient(180deg,#fff8f6_0%,#ffffff_72%)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Nouveautés du moment</p>
            <h2 className="mt-2 font-serif text-4xl text-wine md:text-5xl">🔥 FLASH NERA</h2>
            <p className="mt-2 max-w-xl text-sm text-black/50">Les pièces qui viennent d’arriver — à découvrir maintenant.</p>
          </div>
          <Link href="/flash" className="shrink-0 text-sm text-brown underline">
            Tout voir
          </Link>
        </div>
        <div className="mt-7 flex snap-x gap-4 overflow-x-auto pb-3 no-scrollbar md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
          {products.map((product) => (
            <div key={product.slug} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
              <FlashProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
