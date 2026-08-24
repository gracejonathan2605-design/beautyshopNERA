import { registerCustomer } from "@/app/actions/auth";
import { BrandLogo } from "@/components/brand/logo";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-4">
        <BrandLogo size="md" />
      </div>
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Bienvenue</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Inscription</h1>
      {error ? <p className="mt-3 text-sm text-red-700">Impossible de créer le compte.</p> : null}
      <form action={registerCustomer} className="mt-8 space-y-3 rounded-[1.7rem] border border-[#eee0e6] bg-white p-6">
        <input name="firstName" required placeholder="Prénom" className="w-full rounded-xl border px-4 py-3" />
        <input name="lastName" required placeholder="Nom" className="w-full rounded-xl border px-4 py-3" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border px-4 py-3" />
        <input name="phone" placeholder="Téléphone" className="w-full rounded-xl border px-4 py-3" />
        <input name="password" type="password" required minLength={8} placeholder="Mot de passe (8+)" className="w-full rounded-xl border px-4 py-3" />
        <button className="w-full rounded-full bg-brown py-3 text-cream">Créer mon compte</button>
      </form>
    </div>
  );
}
