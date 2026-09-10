import { requireStaff } from "@/lib/guard";
import { getShopSettings } from "@/lib/settings";
import { saveSettings } from "@/app/actions/admin";
import { NERA_IDENTITY } from "@/lib/nera-identity";

export default async function SettingsPage() {
  await requireStaff("settings.view");
  const s = await getShopSettings();
  return (
    <div>
      <h1 className="font-serif text-4xl">Paramètres</h1>
      <p className="mt-2 max-w-xl text-sm text-black/55">
        Ces informations apparaissent sur le ticket de caisse (impression thermique 80 mm et WhatsApp).
      </p>
      <div className="mt-6 rounded-2xl border border-[#eee0e6] bg-blush/40 p-5 text-sm leading-relaxed text-black/65">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Identité officielle (NAP)</p>
        <p className="mt-2 font-medium text-wine">{NERA_IDENTITY.name}</p>
        <p>{NERA_IDENTITY.slogan}</p>
        <p className="mt-2">{NERA_IDENTITY.addressLine}</p>
        <p>Tél. {NERA_IDENTITY.phoneDisplay}</p>
        <p className="mt-3 text-xs text-black/50">
          Nom, slogan, adresse et téléphone public sont figés pour rester identiques sur le site, les tickets POS et
          Google. Ils ne se modifient pas ici.
        </p>
      </div>
      <form action={saveSettings} className="mt-6 grid gap-3 rounded-2xl border border-[#eee0e6] bg-white p-5 md:grid-cols-2">
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
        <label className="text-sm text-black/50 md:col-span-2">
          Pied de ticket (imprimé et WhatsApp)
          <textarea name="ticketFooter" defaultValue={s.ticketFooter} rows={3} className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine" />
        </label>
        <label className="text-sm text-black/50">
          Durée FLASH NERA des nouveaux produits (jours)
          <input
            name="flashDurationDays"
            type="number"
            min={1}
            max={90}
            defaultValue={s.flashDurationDays}
            className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine"
          />
        </label>
        <label className="text-sm text-black/50">
          Libérer le stock des commandes impayées après (heures)
          <input
            name="pendingOrderHours"
            type="number"
            min={0}
            max={168}
            defaultValue={s.pendingOrderHours}
            className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine"
          />
        </label>
        <p className="text-xs text-black/45 md:col-span-2">
          S’applique uniquement aux prochaines premières publications. Les Flash déjà en cours ne bougent pas. Cette durée n’est jamais affichée aux clientes.
        </p>
        <p className="text-xs text-black/45 md:col-span-2">
          Les commandes en ligne encore « en attente » sans paiement confirmé sont annulées après ce délai, et le stock réservé est libéré. 0 = désactivé. Défaut : 24 heures.
        </p>
        <button className="rounded-full bg-brown py-2 text-cream">Enregistrer</button>
      </form>
    </div>
  );
}