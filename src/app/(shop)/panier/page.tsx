import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { setCartQtyForm } from "@/app/actions/shop";
import { sellableOnlineWhere } from "@/lib/product-query";
import { variantAvailable } from "@/lib/stock-display";
import Link from "next/link";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ ajoute?: string; ignore?: string }>;
}) {
  const cart = await getCart();
  const { ajoute, ignore } = await searchParams;
  const variants = cart.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: cart.map((i) => i.variantId) }, ...sellableOnlineWhere },
        select: {
          id: true,
          name: true,
          salePrice: true,
          promoPrice: true,
          inventories: { select: { onHand: true, reserved: true } },
          product: { select: { name: true } },
        },
      })
    : [];
  const rows = cart
    .map((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      return variant ? { item, variant, available: variantAvailable(variant.inventories) } : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const total = rows.reduce((s, r) => s + unitPrice(r.variant) * r.item.quantity, 0);
  const canCheckout = rows.some((r) => r.available > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Votre sélection</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Panier</h1>
      {ajoute ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {ajoute} article{Number(ajoute) > 1 ? "s" : ""} remis dans le panier.
          {ignore ? ` ${ignore} en rupture (bientôt de retour).` : ""}
        </p>
      ) : null}
      {!rows.length ? (
        <div className="mt-8 rounded-[1.7rem] border border-[#eee0e6] bg-white/80 p-8 text-center">
          <p className="text-black/60">Votre panier est encore vide.</p>
          <Link href="/boutique" className="mt-6 inline-block rounded-full bg-brown px-6 py-3 text-cream">
            Continuer mes achats
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {rows.map(({ item, variant, available }) => (
            <div key={item.variantId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eee0e6] bg-white p-4">
              <div>
                <p className="font-medium">{variant.product.name}</p>
                <p className="text-sm text-black/50">{variant.name}</p>
                <p>{formatCfa(unitPrice(variant) * item.quantity)}</p>
                {available <= 0 ? (
                  <p className="mt-1 text-xs text-wine">Bientôt de retour — retirez-le pour commander le reste.</p>
                ) : null}
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
                  <button className="h-8 w-8 rounded-full border" type="submit" disabled={available <= item.quantity}>
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
          <PayDeliveryBadges />
          {canCheckout ? (
            <Link href="/checkout" className="block rounded-full bg-brown py-3 text-center text-cream">
              Commander
            </Link>
          ) : (
            <p className="rounded-2xl bg-blush px-4 py-3 text-center text-sm text-wine">
              Tous les articles sont en rupture. Ils restent visibles en boutique — bientôt de retour.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
