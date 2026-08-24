import { requireStaff } from "@/lib/guard";
import { getShopSettings } from "@/lib/settings";
import { saveSettings } from "@/app/actions/admin";

export default async function SettingsPage() {
  await requireStaff("settings.view");
  const s = await getShopSettings();
  return (
    <div>
      <h1 className="font-serif text-4xl">Paramètres</h1>
      <form action={saveSettings} className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-2">
        <input name="name" defaultValue={s.name} className="rounded-xl border px-3 py-2" />
        <input name="slogan" defaultValue={s.slogan} className="rounded-xl border px-3 py-2" />
        <input name="phone" defaultValue={s.phone} className="rounded-xl border px-3 py-2" />
        <input name="email" defaultValue={s.email} className="rounded-xl border px-3 py-2" />
        <input name="address" defaultValue={s.address} className="rounded-xl border px-3 py-2" />
        <input name="city" defaultValue={s.city} className="rounded-xl border px-3 py-2" />
        <input name="country" defaultValue={s.country} className="rounded-xl border px-3 py-2" />
        <textarea name="ticketFooter" defaultValue={s.ticketFooter} className="rounded-xl border px-3 py-2 md:col-span-2" />
        <button className="rounded-full bg-brown py-2 text-cream">Enregistrer</button>
      </form>
    </div>
  );
}
