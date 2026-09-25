"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { checkoutOrder, previewCheckoutCoupon, type CheckoutState } from "@/app/actions/shop";
import { formatCfa } from "@/lib/money";
import { PAYMENT_INSTRUCTIONS, payableTotal, shippingFeeFor, type PaymentNetwork } from "@/lib/checkout";
import type { PaymentInstruction } from "@/lib/payments/mobile-money";
import { FormBusyOverlay } from "@/components/admin/form-pending";

const INITIAL: CheckoutState = { ok: false };

export function CheckoutForm({
  subtotal,
  zones,
  customer,
  instructions = PAYMENT_INSTRUCTIONS,
}: {
  subtotal: number;
  zones: { id: string; name: string; fee: number }[];
  instructions?: Record<PaymentNetwork, PaymentInstruction>;
  customer?: {
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
  } | null;
}) {
  const [state, action, pending] = useActionState(checkoutOrder, INITIAL);
  const [fulfillment, setFulfillment] = useState("PICKUP");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponBusy, startCoupon] = useTransition();
  const canDeliver = zones.length > 0;
  const fulfillmentMode = canDeliver ? fulfillment : "PICKUP";
  const zoneFee = zones.find((z) => z.id === zoneId)?.fee ?? 0;
  const shipping = shippingFeeFor(fulfillmentMode, zoneFee);
  const total = useMemo(
    () => payableTotal(subtotal, couponDiscount, shipping),
    [subtotal, couponDiscount, shipping],
  );
  const delivery = fulfillmentMode === "DELIVERY";

  function applyCoupon() {
    startCoupon(async () => {
      const result = await previewCheckoutCoupon(couponCode, subtotal);
      if (result.ok) {
        setCouponDiscount(result.discount);
        setCouponLabel(result.label);
        setCouponCode(result.code);
        setCouponError("");
      } else {
        setCouponDiscount(0);
        setCouponLabel("");
        setCouponError(result.error);
      }
    });
  }

  return (
    <form action={action} className="relative mt-6 space-y-4 rounded-[1.7rem] border border-[#eee0e6] bg-white p-4 max-md:pb-28 sm:p-6">
      <FormBusyOverlay
        active={pending}
        title="Enregistrement de la commande"
        detail="Nous enregistrons votre commande, puis afficherons le reçu et le mode de paiement."
      />
      {state.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      ) : null}

      <p className="font-serif text-5xl text-brown">{formatCfa(total)}</p>
      <p className="text-sm text-wine/70">Une demande arrive sur votre téléphone.</p>

      <label className="block text-sm">
        Mode
        <select
          name="fulfillment"
          value={fulfillmentMode}
          onChange={(e) => setFulfillment(e.target.value === "DELIVERY" && canDeliver ? "DELIVERY" : "PICKUP")}
          className="mt-1 w-full rounded-xl border px-4 py-3"
        >
          <option value="PICKUP">Retrait boutique — 0 F de livraison</option>
          <option value="DELIVERY" disabled={!canDeliver}>
            {canDeliver ? "Livraison — frais selon la zone" : "Livraison indisponible (retrait uniquement)"}
          </option>
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

      <input
        name="shippingName"
        required
        defaultValue={customer?.shippingName}
        placeholder="Nom complet"
        className="w-full rounded-xl border px-4 py-3"
      />
      <input
        name="shippingPhone"
        required
        defaultValue={customer?.shippingPhone}
        placeholder="Téléphone"
        className="w-full rounded-xl border px-4 py-3"
      />
      {!customer ? (
        <p className="text-xs text-black/50">
          Sans compte, la commande est rattachée à ce téléphone. En créant un compte avec le même numéro, vous la
          retrouverez dans Mon compte.
        </p>
      ) : null}
      {delivery ? (
        <>
          <input
            name="shippingAddress"
            required
            defaultValue={customer?.shippingAddress}
            placeholder="Adresse de livraison"
            className="w-full rounded-xl border px-4 py-3"
          />
          <input
            name="shippingCity"
            required
            defaultValue={customer?.shippingCity}
            placeholder="Ville / quartier"
            className="w-full rounded-xl border px-4 py-3"
          />
        </>
      ) : null}

      <div className="rounded-2xl border border-[#eee0e6] bg-[#fffcfb] p-4">
        <label className="block text-sm">
          Code promo
          <span className="mt-1 flex gap-2">
            <input
              name="couponCode"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponDiscount(0);
                setCouponLabel("");
                setCouponError("");
              }}
              placeholder="NERA10"
              className="w-full rounded-xl border px-4 py-3 uppercase"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={couponBusy || !couponCode.trim()}
              className="shrink-0 rounded-xl border border-[#eee0e6] px-4 py-3 text-sm disabled:opacity-50"
            >
              {couponBusy ? "…" : "Appliquer"}
            </button>
          </span>
        </label>
        {couponError ? <p className="mt-2 text-sm text-red-700">{couponError}</p> : null}
        {couponLabel && couponDiscount > 0 ? (
          <p className="mt-2 text-sm text-emerald-800">
            {couponLabel} appliqué : −{formatCfa(couponDiscount)}
          </p>
        ) : (
          <p className="mt-2 text-xs text-black/45">Exemple : NERA10 dès 20 000 FCFA d’articles.</p>
        )}
      </div>

      <p className="text-sm text-wine/70">Orange Money sans frais · Livraison 24h à Yaoundé · Retrait en magasin</p>

      <fieldset className="space-y-3">
        <legend className="text-sm text-wine">Paiement</legend>
        <p className="text-sm text-black/65">Une demande arrive sur votre téléphone.</p>
        <label className="flex items-start gap-3 text-sm">
          <input type="radio" name="paymentNetwork" value="ORANGE" defaultChecked className="mt-1" />
          <span>
            <strong>Orange Money — sans frais.</strong> {instructions.ORANGE.code} ·{" "}
            {instructions.ORANGE.name}.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="radio" name="paymentNetwork" value="MTN" className="mt-1" />
          <span>
            <strong>MTN MoMo.</strong> {instructions.MTN.code} · {instructions.MTN.name}.
          </span>
        </label>
      </fieldset>

      <div className="rounded-2xl border border-[#eee0e6] bg-[#fffcfb] p-4 text-sm">
        <p className="flex justify-between">
          <span>Articles</span>
          <span>{formatCfa(subtotal)}</span>
        </p>
        {couponDiscount > 0 ? (
          <p className="mt-1 flex justify-between text-emerald-800">
            <span>Code promo {couponCode}</span>
            <span>−{formatCfa(couponDiscount)}</span>
          </p>
        ) : null}
        <p className="mt-1 flex justify-between">
          <span>{delivery ? "Livraison 24h (payée en une fois avec la commande)" : "Livraison"}</span>
          <span>{delivery ? formatCfa(shipping) : "Offerte (retrait)"}</span>
        </p>
        <p className="mt-3 flex justify-between font-serif text-3xl text-brown">
          <span>Total à payer</span>
          <span>{formatCfa(total)}</span>
        </p>
      </div>

      <button disabled={pending} className="w-full rounded-full bg-brown py-3.5 text-cream disabled:opacity-60 max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(4.4rem+env(safe-area-inset-bottom))] max-md:z-30 max-md:w-auto max-md:shadow-lg">
        {pending ? "Confirmation…" : `Confirmer la commande — ${formatCfa(total)}`}
      </button>
    </form>
  );
}
