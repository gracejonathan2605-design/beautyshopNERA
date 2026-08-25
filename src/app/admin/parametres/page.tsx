import { requireStaff } from "@/lib/guard";
import { getShopSettings } from "@/lib/settings";
import { saveSettings } from "@/app/actions/admin";

export default async function SettingsPage() {
  await requireStaff("settings.view");
  const s = await getShopSettings();
  return (
    <div>
      <h1 className="font-serif text-4xl">Paramètres</h1>
      <p className="mt-2 max-w-xl text-sm text-black/55">
        Ces informations apparaissent sur le ticket de caisse (impression thermique 80 mm et WhatsApp).
      </p>
      <form action={saveSettings} className="mt-6 grid gap-3 rounded-2xl border border-[#eee0e6] bg-white p-5 md:grid-cols-2">
        <label className="text-sm text-black/50">
          Nom de la boutique
          <input name="name" defaultValue={s.name} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          Slogan
          <input name="slogan" defaultValue={s.slogan} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          Téléphone WhatsApp
          <input name="phone" defaultValue={s.phone} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          Email
          <input name="email" defaultValue={s.email} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          Numéro MTN / MoMo
          <input name="mtnPhone" defaultValue={s.mtnPhone} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          RCCM
          <input name="rccm" defaultValue={s.rccm} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          NUI
          <input name="nui" defaultValue={s.nui} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          Adresse
          <input name="address" defaultValue={s.address} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          Ville
          <input name="city" defaultValue={s.city} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50 md:col-span-2">
          Pays
          <input name="country" defaultValue={s.country} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50 md:col-span-2">
          Pied de ticket (imprimé et WhatsApp)
          <textarea name="ticketFooter" defaultValue={s.ticketFooter} rows={3} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <button className="rounded-full bg-brown py-2 text-cream">Enregistrer</button>
      </form>
    </div>
  );
}
