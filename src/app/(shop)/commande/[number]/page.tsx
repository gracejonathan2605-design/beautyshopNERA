import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";
import { getShopSettings } from "@/lib/settings";
import { saleToReceipt } from "@/lib/receipt";
import { OrderTicketButton } from "@/components/shop/order-ticket";

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { number },
      include: { items: true, payments: true },
    }),
    getShopSettings(),
  ]);
  if (!order) notFound();

  const receipt = saleToReceipt(
    {
      number: order.number,
      createdAt: order.createdAt,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      items: order.items.map((i) => ({
        productName: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
      payments: order.payments.length
        ? order.payments.map((p) => ({ method: p.method, amount: p.amount }))
        : [{ method: "OTHER", amount: order.total }],
      customer: order.shippingName
        ? { firstName: order.shippingName, lastName: "", phone: order.shippingPhone }
        : null,
    },
    {
      name: settings.name,
      slogan: settings.slogan,
      address: settings.address,
      city: `${settings.city}, ${settings.country}`,
      phone: settings.phone,
      ticketFooter: settings.ticketFooter,
    },
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Confirmation</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Commande {order.number}</h1>
      <p className="mt-2 text-black/60">Statut : {order.status}</p>
      <ul className="mt-6 space-y-2">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between rounded-2xl border border-[#eee0e6] bg-white px-4 py-3">
            <span>
              {i.productName} × {i.quantity}
            </span>
            <span>{formatCfa(i.total)}</span>
          </li>
        ))}
      </ul>
      {order.shippingFee > 0 ? (
        <p className="mt-3 flex justify-between text-sm text-black/50">
          <span>Livraison</span>
          <span>{formatCfa(order.shippingFee)}</span>
        </p>
      ) : null}
      <p className="mt-6 text-right font-serif text-3xl text-wine">{formatCfa(order.total)}</p>
      <OrderTicketButton data={receipt} />
    </div>
  );
}
