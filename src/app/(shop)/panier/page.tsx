import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { setCartQty } from "@/app/actions/shop";
import Link from "next/link";

export default async function CartPage() {
  const cart = await getCart();
  const variants = cart.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: cart.map((i) => i.variantId) } },
        include: { product: true },
      })
    : [];
  const rows = cart.map((item) => {
    const variant = variants.find((v) => v.id === item.variantId);
    return { item, variant };
  });
  const total = rows.reduce((s, r) => s + (r.variant ? unitPrice(r.variant) * r.item.quantity : 0), 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Votre sélection</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Panier</h1>
      {!rows.length ? (
        <div className="mt-8 rounded-[1.7rem] border border-[#eee0e6] bg-white/80 p-8 text-center">
          <p className="text-black/60">Votre panier est encore vide.</p>
          <Link href="/boutique" className="mt-6 inline-block rounded-full bg-brown px-6 py-3 text-cream">
            Continuer mes achats
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {rows.map(({ item, variant }) =>
            variant ? (
              <div key={item.variantId} className="flex items-center justify-between rounded-2xl border border-[#eee0e6] bg-white p-4">
                <div>
                  <p className="font-medium">{variant.product.name}</p>
                  <p className="text-sm text-black/50">{variant.name}</p>
                  <p>{formatCfa(unitPrice(variant))}</p>
                </div>
                <form action={async () => { "use server"; await setCartQty(item.variantId, 0); }}>
                  <button className="text-sm">Retirer</button>
                </form>
              </div>
            ) : null,
          )}
          <p className="text-right font-serif text-3xl">Total {formatCfa(total)}</p>
          <Link href="/checkout" className="block rounded-full bg-brown py-3 text-center text-cream">
            Commander
          </Link>
        </div>
      )}
    </div>
  );
}
