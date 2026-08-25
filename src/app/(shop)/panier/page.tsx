import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { setCartQtyForm } from "@/app/actions/shop";
import Link from "next/link";

export default async function CartPage() {
  const cart = await getCart();
  const variants = cart.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: cart.map((i) => i.variantId) }, isActive: true, deletedAt: null },
        include: { product: true },
      })
    : [];
  const rows = cart
    .map((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      return variant ? { item, variant } : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const total = rows.reduce((s, r) => s + unitPrice(r.variant) * r.item.quantity, 0);

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
          {rows.map(({ item, variant }) => (
            <div key={item.variantId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eee0e6] bg-white p-4">
              <div>
                <p className="font-medium">{variant.product.name}</p>
                <p className="text-sm text-black/50">{variant.name}</p>
                <p>{formatCfa(unitPrice(variant) * item.quantity)}</p>
              </div>
              <div className="flex items-center gap-2">
                <form action={setCartQtyForm}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="quantity" value={item.quantity - 1} />
                  <button className="h-8 w-8 rounded-full border" type="submit">
                    −
                  </button>
                </form>
                <span className="min-w-6 text-center text-sm">{item.quantity}</span>
                <form action={setCartQtyForm}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="quantity" value={item.quantity + 1} />
                  <button className="h-8 w-8 rounded-full border" type="submit">
                    +
                  </button>
                </form>
                <form action={setCartQtyForm}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="quantity" value={0} />
                  <button className="text-sm text-red-700" type="submit">
                    Retirer
                  </button>
                </form>
              </div>
            </div>
          ))}
          <p className="text-right font-serif text-3xl">Total {formatCfa(total)}</p>
          <Link href="/checkout" className="block rounded-full bg-brown py-3 text-center text-cream">
            Commander
          </Link>
        </div>
      )}
    </div>
  );
}
