import { prisma } from "@/lib/prisma";
import { billableLineQuantity, cartCanCheckout, cartPayableTotal, getCart } from "@/lib/cart";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { setCartQtyForm } from "@/app/actions/shop";
import { sellableOnlineWhere, shopInventorySelect } from "@/lib/product-query";
import { variantAvailable } from "@/lib/stock-display";
import Link from "next/link";
import { RegistreTrustLink } from "@/components/shop/registre-commerce";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ ajoute?: string; ignore?: string; deja?: string }>;
}) {
  const cart = await getCart();
  const { ajoute, ignore, deja } = await searchParams;
  const variants = cart.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: cart.map((i) => i.variantId) }, ...sellableOnlineWhere },
        select: {
          id: true,
          name: true,
          salePrice: true,
          promoPrice: true,
          inventories: shopInventorySelect,
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
  const staleItems = cart.filter((item) => !variants.some((v) => v.id === item.variantId));
  const total = cartPayableTotal(
    rows.map((row) => ({
      unitPrice: unitPrice(row.variant),
      quantity: row.item.quantity,
      available: row.available,
    })),
  );
  const canCheckout = cartCanCheckout(
    rows.map((r) => ({ available: r.available, quantity: r.item.quantity })),
    cart.length,
  );
  const hasLines = rows.length > 0 || staleItems.length > 0;

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
      {deja ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ces articles sont déjà dans le panier, au maximum disponible.
          {ignore ? ` ${ignore} autre${Number(ignore) > 1 ? "s" : ""} en rupture (bientôt de retour).` : ""}
        </p>
      ) : null}
      {!hasLines ? (
        <div className="mt-8 rounded-[1.7rem] border border-[#eee0e6] bg-white/80 p-8 text-center">
          <p className="text-black/60">Votre panier est encore vide.</p>
          <Link href="/boutique" className="mt-6 inline-block rounded-full bg-brown px-6 py-3 text-cream">
            Continuer mes achats
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {staleItems.map((item) => (
            <div
              key={item.variantId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eee0e6] bg-white p-4"
            >
              <div>
                <p className="font-medium">Article plus en vente</p>
                <p className="mt-1 text-xs text-wine">Retirez-le pour commander le reste.</p>
              </div>
              <form action={setCartQtyForm}>
                <input type="hidden" name="variantId" value={item.variantId} />
                <input type="hidden" name="quantity" value={0} />
                <button className="text-sm text-red-700" type="submit" aria-label="Retirer cet article du panier">
                  Retirer
                </button>
              </form>
            </div>
          ))}
          {rows.map(({ item, variant, available }) => (
            <div key={item.variantId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eee0e6] bg-white p-4">
              <div>
                <p className="font-medium">{variant.product.name}</p>
                <p className="text-sm text-black/50">{variant.name}</p>
                <p>
                  {billableLineQuantity(item.quantity, available) > 0
                    ? formatCfa(unitPrice(variant) * billableLineQuantity(item.quantity, available))
                    : "Hors total"}
                </p>
                {available <= 0 ? (
                  <p className="mt-1 text-xs text-wine">Bientôt de retour — retirez-le pour commander le reste.</p>
                ) : available < item.quantity ? (
                  <p className="mt-1 text-xs text-wine">
                    Seulement {available} en stock — baissez la quantité pour commander.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <form action={setCartQtyForm}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="quantity" value={item.quantity - 1} />
                  <button className="h-8 w-8 rounded-full border" type="submit" aria-label="Diminuer la quantité">
                    −
                  </button>
                </form>
                <span className="min-w-6 text-center text-sm">{item.quantity}</span>
                <form action={setCartQtyForm}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="quantity" value={item.quantity + 1} />
                  <button
                    className="h-8 w-8 rounded-full border"
                    type="submit"
                    aria-label="Augmenter la quantité"
                    disabled={available <= item.quantity}
                    title={available <= item.quantity ? "Quantité maximale du stock" : undefined}
                  >
                    +
                  </button>
                </form>
                <form action={setCartQtyForm}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <input type="hidden" name="quantity" value={0} />
                  <button className="text-sm text-red-700" type="submit" aria-label="Retirer du panier">
                    Retirer
                  </button>
                </form>
              </div>
            </div>
          ))}
          <p className="text-right font-serif text-3xl">
            {canCheckout ? "Total" : "Total commandable"} {formatCfa(total)}
          </p>
          <PayDeliveryBadges />
          <RegistreTrustLink />
          {canCheckout ? (
            <Link href="/checkout" className="block rounded-full bg-brown py-3 text-center text-cream">
              Commander
            </Link>
          ) : (
            <p className="rounded-2xl bg-blush px-4 py-3 text-center text-sm text-wine">
              Ajustez ou retirez les articles indisponibles avant de commander.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
