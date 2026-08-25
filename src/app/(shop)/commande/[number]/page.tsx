import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";
import { getShopSettings } from "@/lib/settings";
import { saleToReceipt } from "@/lib/receipt";
import { OrderTicketButton } from "@/components/shop/order-ticket";
import { isPaymentNetwork, PAYMENT_INSTRUCTIONS } from "@/lib/checkout";
import { BrandLogo } from "@/components/brand/logo";
import { getCustomerSession, getStaffSession } from "@/lib/auth";
import { isValidOrderAccessToken } from "@/lib/order-access";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const [order, settings, staff, customer] = await Promise.all([
    prisma.order.findUnique({
      where: { number },
      include: { items: true, payments: true, deliveryZone: true },
    }),
    getShopSettings(),
    getStaffSession().catch(() => null),
    getCustomerSession().catch(() => null),
  ]);
  if (!order) notFound();
  const allowed =
    isValidOrderAccessToken(number, t) ||
    Boolean(staff) ||
    Boolean(customer && order.customerId === customer.customerId);
  if (!allowed) notFound();
  const paid = order.payments.some((p) => p.status === "COMPLETED");

  const networkRaw = order.payments[0]?.provider ?? order.payments[0]?.reference ?? "ORANGE";
  const network = isPaymentNetwork(networkRaw) ? networkRaw : "ORANGE";
  const pay = PAYMENT_INSTRUCTIONS[network];
  const other = PAYMENT_INSTRUCTIONS[network === "ORANGE" ? "MTN" : "ORANGE"];

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
      <div className="flex justify-center">
        <BrandLogo size="md" />
      </div>
      <p className="mt-4 text-center text-xs uppercase tracking-[0.28em] text-gold">Commande reçue</p>
      <h1 className="mt-2 text-center font-serif text-4xl text-wine">Merci, nous avons bien reçu votre commande</h1>
      <p className="mt-3 text-center text-black/60">
        Commande <strong>{order.number}</strong>
        {paid ? " · Paiement reçu." : ". Payez maintenant le montant ci-dessous, puis gardez ce reçu."}
      </p>

      {paid ? (
        <section className="mt-8 rounded-[1.7rem] border border-emerald-200 bg-emerald-50 p-6">
          <p className="font-medium text-emerald-900">Paiement confirmé</p>
          <p className="mt-2 text-sm text-emerald-800">Montant : {formatCfa(order.total)}</p>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded-[1.7rem] border border-gold/40 bg-champagne/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{pay.title}</p>
            <p className="mt-3 font-serif text-3xl text-wine">{pay.code}</p>
            <p className="mt-1 text-sm text-black/70">{pay.name}</p>
            <p className="mt-3 text-sm leading-relaxed text-black/65">{pay.detail}</p>
            <p className="mt-4 font-serif text-2xl text-wine">Montant : {formatCfa(order.total)}</p>
            {order.fulfillment === "DELIVERY" ? (
              <p className="mt-2 text-sm text-black/55">
                Livraison {order.deliveryZone?.name ?? ""} incluse ({formatCfa(order.shippingFee)}) — un seul paiement.
              </p>
            ) : (
              <p className="mt-2 text-sm text-black/55">Retrait boutique : pas de frais de livraison.</p>
            )}
          </section>
          <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-black/55">
            Autre réseau : {other.label} — {other.code} ({other.name}). {other.detail}
          </p>
        </>
      )}

      <ul className="mt-8 space-y-2">
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
      {order.discount > 0 ? (
        <p className="mt-1 flex justify-between text-sm text-black/50">
          <span>Remise</span>
          <span>-{formatCfa(order.discount)}</span>
        </p>
      ) : null}
      <p className="mt-6 text-right font-serif text-3xl text-wine">{formatCfa(order.total)}</p>
      <OrderTicketButton data={receipt} />
    </div>
  );
}
