"use client";

import { useActionState } from "react";
import { updateCustomerProfile, type ProfileState } from "@/app/actions/shop";
import { FormBusyOverlay, PendingSubmitButton } from "@/components/admin/form-pending";

const INITIAL: ProfileState = { ok: false };

export function AccountProfileForm({
  customer,
}: {
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updateCustomerProfile, INITIAL);
  return (
    <form action={action} className="relative mt-4 space-y-3 rounded-[1.7rem] border border-[#eee0e6] bg-white p-6">
      <FormBusyOverlay active={pending} title="Enregistrement" detail="Mise à jour de votre profil." />
      {state.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      {state.ok ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Profil enregistré.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="firstName" required defaultValue={customer.firstName} placeholder="Prénom" className="rounded-xl border px-4 py-3" />
        <input name="lastName" required defaultValue={customer.lastName} placeholder="Nom" className="rounded-xl border px-4 py-3" />
      </div>
      <input name="email" type="email" required defaultValue={customer.email ?? ""} placeholder="Email" className="w-full rounded-xl border px-4 py-3" />
      <input name="phone" defaultValue={customer.phone ?? ""} placeholder="Téléphone / WhatsApp" className="w-full rounded-xl border px-4 py-3" />
      <input name="address" defaultValue={customer.address ?? ""} placeholder="Adresse de livraison" className="w-full rounded-xl border px-4 py-3" />
      <input name="city" defaultValue={customer.city ?? ""} placeholder="Ville / quartier" className="w-full rounded-xl border px-4 py-3" />
      <input name="password" type="password" minLength={8} placeholder="Nouveau mot de passe (optionnel)" className="w-full rounded-xl border px-4 py-3" />
      <PendingSubmitButton
        idle="Enregistrer mon profil"
        pendingLabel="Enregistrement…"
        className="w-full rounded-full bg-brown py-3 text-cream disabled:cursor-not-allowed disabled:opacity-60"
      />
    </form>
  );
}
