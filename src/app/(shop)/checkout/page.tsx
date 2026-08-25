import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { sellableOnlineWhere } from "@/lib/product-query";

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart.length) redirect("/panier");

  try {
    const [variants, zones] = await Promise.all([
      prisma.productVariant.findMany({
        where: { id: { in: cart.map((i) => i.variantId) }, ...sellableOnlineWhere },
        select: { id: true, salePrice: true, promoPrice: true },
      }),
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, fee: true },
      }),
    ]);

    const subtotal = cart.reduce((s, item) => {
      const v = variants.find((x) => x.id === item.variantId);
      return s + (v ? unitPrice(v) * item.quantity : 0);
    }, 0);

    if (!subtotal) {
      return (
        <div className="mx-auto max-w-xl px-4 py-10">
          <h1 className="font-serif text-4xl text-wine">Finaliser</h1>
          <p className="mt-4 text-black/60">Votre panier n’est plus valable. Revenez au panier pour le mettre à jour.</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Commande</p>
        <h1 className="mt-2 font-serif text-5xl text-wine">Finaliser</h1>
        <p className="mt-2 text-black/55">
          Articles {formatCfa(subtotal)}. En livraison, les frais s’ajoutent automatiquement — un seul paiement pour
          les articles et la course. Livraison rapide sous 24h à Yaoundé.
        </p>
        <div className="mt-4">
          <PayDeliveryBadges />
        </div>
        <CheckoutForm subtotal={subtotal} zones={zones} />
      </div>
    );
  } catch {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-serif text-4xl text-wine">Finaliser</h1>
        <p className="mt-4 text-black/60">
          La commande n’a pas pu se charger. Vérifiez votre connexion, puis réessayez depuis le panier.
        </p>
      </div>
    );
  }
}
