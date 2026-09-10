import { requireStaff } from "@/lib/guard";
import { getShopSettings } from "@/lib/settings";
import { saveSettings, sendTestOrderWhatsApp } from "@/app/actions/admin";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { AdminFlash } from "@/components/admin/flash";
import { hasPermission } from "@/lib/permissions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("settings.view");
  const s = await getShopSettings();
  const { ok, erreur } = await searchParams;
  const canUpdate = hasPermission(session, "settings.update");
  return (
    <div>
      <h1 className="font-serif text-4xl">Paramètres</h1>
      <p className="mt-2 max-w-xl text-sm text-black/55">
        Ces informations apparaissent sur le ticket de caisse (impression thermique 80 mm et WhatsApp).
      </p>
      <AdminFlash ok={ok} erreur={erreur} />
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

      <section className="mt-8 rounded-2xl border border-[#eee0e6] bg-white p-5">
        <h2 className="font-serif text-2xl text-wine">Alerte WhatsApp des commandes site</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          CallMeBot n’envoie souvent <strong>aucune clé</strong> au Cameroun. On utilise Green API : les identifiants
          s’affichent sur le site, pas dans WhatsApp.
        </p>
        <p className="mt-2 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          L’URL API est obligatoire. Dans Green API → Instances → votre instance, copiez la ligne <strong>apiUrl</strong>{" "}
          (pas <strong>mediaUrl</strong>). Elle commence par <code>https://</code>. Sans cette URL, le site affiche un
          échec. Pour tester, utilisez le bouton ci-dessous après avoir scanné le QR.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-black/65">
          <li>
            Créez un compte gratuit sur{" "}
            <a className="underline" href="https://console.green-api.com" target="_blank" rel="noreferrer">
              console.green-api.com
            </a>
          </li>
          <li>Créez une instance, puis scannez le QR avec le WhatsApp boutique {NERA_IDENTITY.phoneDisplay}.</li>
          <li>Copiez idInstance, apiTokenInstance et apiUrl, collez-les ci-dessous, enregistrez, puis envoyez un test.</li>
        </ol>
        {canUpdate ? (
          <>
            <form action={saveSettings} className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-black/50">
                Numéro qui reçoit les commandes
                <input
                  name="orderWhatsAppTo"
                  defaultValue={s.orderWhatsAppTo}
                  placeholder="237676935195"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine"
                />
              </label>
              <label className="text-sm text-black/50">
                ID instance (idInstance)
                <input
                  name="greenApiId"
                  defaultValue={s.greenApiId}
                  placeholder="1103…"
                  className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine"
                />
              </label>
              <label className="text-sm text-black/50 md:col-span-2">
                URL API (apiUrl) — obligatoire, pas mediaUrl
                <input
                  name="greenApiUrl"
                  defaultValue={s.greenApiUrl}
                  placeholder="https://1103.api.green-api.com"
                  className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine"
                />
              </label>
              <label className="text-sm text-black/50 md:col-span-2">
                Token API (apiTokenInstance)
                <input
                  name="greenApiToken"
                  type="password"
                  autoComplete="off"
                  placeholder={s.greenApiToken ? "Laisser vide pour ne pas changer" : "Collez le token ici"}
                  className="mt-1 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-wine"
                />
              </label>
              <p className="text-xs text-black/45 md:col-span-2">
                {s.greenApiId && s.greenApiToken
                  ? "Green API est enregistré. Envoyez un test pour vérifier."
                  : "Sans ces trois champs, la commande se crée quand même, mais aucun WhatsApp n’est envoyé."}
              </p>
              <button className="rounded-full bg-brown py-2 text-cream md:col-span-2">Enregistrer l’alerte WhatsApp</button>
            </form>
            <form action={sendTestOrderWhatsApp} className="mt-3">
              <button className="rounded-full border border-wine px-4 py-2 text-sm text-wine">
                Envoyer un message test
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-black/50">Vous pouvez voir les paramètres, mais pas les modifier.</p>
        )}
      </section>
    </div>
  );
}
