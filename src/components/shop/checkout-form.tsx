"use client";

import { useActionState, useMemo, useState } from "react";
import { checkoutOrder, type CheckoutState } from "@/app/actions/shop";
import { formatCfa } from "@/lib/money";
import { PAYMENT_INSTRUCTIONS, payableTotal, shippingFeeFor } from "@/lib/checkout";
import { FormBusyOverlay } from "@/components/admin/form-pending";

const INITIAL: CheckoutState = { ok: false };

export function CheckoutForm({
  subtotal,
  zones,
}: {
  subtotal: number;
  zones: { id: string; name: string; fee: number }[];
}) {
  const [state, action, pending] = useActionState(checkoutOrder, INITIAL);
  const [fulfillment, setFulfillment] = useState("PICKUP");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const zoneFee = zones.find((z) => z.id === zoneId)?.fee ?? 0;
  const shipping = shippingFeeFor(fulfillment, zoneFee);
  const total = useMemo(() => payableTotal(subtotal, 0, shipping), [subtotal, shipping]);
  const delivery = fulfillment === "DELIVERY";

  return (
    <form action={action} className="relative mt-8 space-y-4 rounded-[1.7rem] border border-[#eee0e6] bg-white p-6">
      <FormBusyOverlay
        active={pending}
        title="Enregistrement de la commande"
        detail="Nous enregistrons votre commande, puis afficherons le reçu et le mode de paiement."
      />
      {state.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      ) : null}

      <label className="block text-sm">
        Mode
        <select
          name="fulfillment"
          value={fulfillment}
          onChange={(e) => setFulfillment(e.target.value)}
          className="mt-1 w-full rounded-xl border px-4 py-3"
        >
          <option value="PICKUP">Retrait boutique — 0 F de livraison</option>
          <option value="DELIVERY">Livraison — frais selon la zone</option>
        </select>
      </label>

      {delivery ? (
        <label className="block text-sm">
          Zone de livraison
          <select
            name="deliveryZoneId"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="mt-1 w-full rounded-xl border px-4 py-3"
          >
            {zones.length ? (
              zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {formatCfa(z.fee)}
                </option>
              ))
            ) : (
              <option value="">Aucune zone (retrait uniquement)</option>
            )}
          </select>
        </label>
      ) : (
        <input type="hidden" name="deliveryZoneId" value="" />
      )}

      <input name="shippingName" required placeholder="Nom complet" className="w-full rounded-xl border px-4 py-3" />
      <input name="shippingPhone" required placeholder="Téléphone" className="w-full rounded-xl border px-4 py-3" />
      {delivery ? (
        <>
          <input name="shippingAddress" required placeholder="Adresse de livraison" className="w-full rounded-xl border px-4 py-3" />
          <input name="shippingCity" required placeholder="Ville / quartier" className="w-full rounded-xl border px-4 py-3" />
        </>
      ) : null}

      <fieldset className="space-y-2 rounded-2xl bg-blush/60 p-4">
        <legend className="text-sm font-medium text-wine">Paiement Mobile Money</legend>
        <p className="text-sm text-black/60">
          Après confirmation, envoyez <strong>{formatCfa(total)}</strong> puis gardez le reçu.
        </p>
        <label className="flex items-start gap-3 text-sm">
          <input type="radio" name="paymentNetwork" value="ORANGE" defaultChecked className="mt-1" />
          <span>
            <strong>Orange Money — sans frais.</strong> {PAYMENT_INSTRUCTIONS.ORANGE.code} ·{" "}
            {PAYMENT_INSTRUCTIONS.ORANGE.name}.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="radio" name="paymentNetwork" value="MTN" className="mt-1" />
          <span>
            <strong>MTN Money.</strong> {PAYMENT_INSTRUCTIONS.MTN.code} · {PAYMENT_INSTRUCTIONS.MTN.name}.
          </span>
        </label>
      </fieldset>

      <div className="rounded-2xl border border-[#eee0e6] bg-[#fffcfb] p-4 text-sm">
        <p className="flex justify-between">
          <span>Articles</span>
          <span>{formatCfa(subtotal)}</span>
        </p>
        <p className="mt-1 flex justify-between">
          <span>{delivery ? "Livraison (payée en une fois avec la commande)" : "Livraison"}</span>
          <span>{delivery ? formatCfa(shipping) : "Offerte (retrait)"}</span>
        </p>
        <p className="mt-3 flex justify-between font-serif text-2xl text-wine">
          <span>Total à payer</span>
          <span>{formatCfa(total)}</span>
        </p>
      </div>

      <button disabled={pending} className="w-full rounded-full bg-brown py-3 text-cream disabled:opacity-60">
        {pending ? "Confirmation…" : `Confirmer la commande — ${formatCfa(total)}`}
      </button>
    </form>
  );
}
