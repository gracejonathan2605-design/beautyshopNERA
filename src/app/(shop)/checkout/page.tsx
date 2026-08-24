import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { formatCfa } from "@/lib/money";
import { unitPrice } from "@/lib/pricing";
import { checkoutOrder } from "@/app/actions/shop";
import { redirect } from "next/navigation";

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart.length) redirect("/panier");
  const [variants, zones] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: cart.map((i) => i.variantId) } },
      include: { product: true },
    }),
    prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const subtotal = cart.reduce((s, item) => {
    const v = variants.find((x) => x.id === item.variantId);
    return s + (v ? unitPrice(v) * item.quantity : 0);
  }, 0);

  async function submit(formData: FormData) {
    "use server";
    formData.set("amount", String(subtotal));
    const number = await checkoutOrder(formData);
    redirect(`/commande/${number}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Commande</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Finaliser</h1>
      <p className="mt-2 text-black/55">Articles {formatCfa(subtotal)} — les frais dépendent du retrait ou de la zone.</p>
      <form action={submit} className="mt-8 space-y-4 rounded-[1.7rem] border border-[#eee0e6] bg-white p-6">
        <select name="fulfillment" className="w-full rounded-xl border px-4 py-3" defaultValue="PICKUP">
          <option value="PICKUP">Retrait boutique</option>
          <option value="DELIVERY">Livraison</option>
        </select>
        <select name="deliveryZoneId" className="w-full rounded-xl border px-4 py-3">
          <option value="">Zone de livraison</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name} — {formatCfa(z.fee)}
            </option>
          ))}
        </select>
        <input name="shippingName" placeholder="Nom" className="w-full rounded-xl border px-4 py-3" />
        <input name="shippingPhone" placeholder="Téléphone" className="w-full rounded-xl border px-4 py-3" />
        <input name="shippingAddress" placeholder="Adresse" className="w-full rounded-xl border px-4 py-3" />
        <input name="shippingCity" placeholder="Ville" className="w-full rounded-xl border px-4 py-3" />
        <input name="couponCode" placeholder="Coupon" className="w-full rounded-xl border px-4 py-3" />
        <button className="w-full rounded-full bg-brown py-3 text-cream">Confirmer la commande</button>
      </form>
    </div>
  );
}
