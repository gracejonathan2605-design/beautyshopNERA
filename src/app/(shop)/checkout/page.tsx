import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { MaisonPageHead } from "@/components/shop/maison-hero";
import { RegistreTrustLink } from "@/components/shop/registre-commerce";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { sellableOnlineWhere } from "@/lib/product-query";
import { getCustomerSession } from "@/lib/auth";
import { getShopSettings } from "@/lib/settings";
import { paymentInstructions } from "@/lib/payments/mobile-money";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart.length) redirect("/panier");

  const loaded = await loadCheckout(cart);
  if (loaded.status === "invalid") {
    return (
      <>
        <MaisonPageHead
          kicker="Commande"
          title="Finaliser"
          lede="Votre panier n’est plus valable. Revenez au panier pour le mettre à jour."
        />
        <div className="mx-auto max-w-xl px-4 py-10">
          <Link href="/panier" className="inline-block rounded-full bg-brown px-6 py-3 text-cream">
            Retour au panier
          </Link>
        </div>
      </>
    );
  }
  if (loaded.status === "error") {
    return (
      <>
        <MaisonPageHead
          kicker="Commande"
          title="Finaliser"
          lede="La commande n’a pas pu se charger. Vérifiez votre connexion, puis réessayez depuis le panier."
        />
        <div className="mx-auto max-w-xl px-4 py-10">
          <Link href="/panier" className="inline-block rounded-full bg-brown px-6 py-3 text-cream">
            Retour au panier
          </Link>
        </div>
      </>
    );
  }

  const { subtotal, zones, profile, settings } = loaded;
  return (
    <>
      <MaisonPageHead
        kicker="Commande"
        title="Finaliser"
        lede={`Articles ${formatCfa(subtotal)}. En livraison, les frais s’ajoutent automatiquement — un seul paiement pour les articles et la course. Livraison rapide sous 24h à Yaoundé.`}
      />
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <PayDeliveryBadges />
          <RegistreTrustLink />
        </div>
        <CheckoutForm
          subtotal={subtotal}
          zones={zones}
          customer={
            profile
              ? {
                  shippingName: `${profile.firstName} ${profile.lastName}`.trim(),
                  shippingPhone: profile.phone ?? "",
                  shippingAddress: profile.address ?? "",
                  shippingCity: profile.city ?? "",
                }
              : null
          }
          instructions={paymentInstructions(settings)}
        />
      </div>
    </>
  );
}

async function loadCheckout(cart: Awaited<ReturnType<typeof getCart>>) {
  try {
    const [variants, zones, session, settings] = await Promise.all([
      prisma.productVariant.findMany({
        where: { id: { in: cart.map((i) => i.variantId) }, ...sellableOnlineWhere },
        select: { id: true, salePrice: true, promoPrice: true },
      }),
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, fee: true },
      }),
      getCustomerSession().catch(() => null),
      getShopSettings().catch(() => null),
    ]);
    const profile = session
      ? await prisma.customer.findUnique({
          where: { id: session.customerId },
          select: { firstName: true, lastName: true, phone: true, address: true, city: true },
        })
      : null;
    const missing = cart.some((item) => !variants.some((x) => x.id === item.variantId));
    const subtotal = cart.reduce((s, item) => {
      const v = variants.find((x) => x.id === item.variantId);
      return s + (v ? unitPrice(v) * item.quantity : 0);
    }, 0);
    if (missing || !subtotal) return { status: "invalid" as const };
    return { status: "ready" as const, subtotal, zones, profile, settings };
  } catch {
    return { status: "error" as const };
  }
}
