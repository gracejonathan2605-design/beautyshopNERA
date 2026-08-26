import { loginCustomer } from "@/app/actions/auth";
import { BrandLogo } from "@/components/brand/logo";
import { safeNextPath } from "@/lib/safe-path";
import Link from "next/link";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const dest = safeNextPath(next ?? "", "/compte");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-4">
        <BrandLogo size="md" />
      </div>
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Espace cliente</p>
      <h1 className="mt-2 font-serif text-5xl text-wine">Connexion</h1>
      {error ? <p className="mt-3 text-sm text-red-700">Identifiants incorrects.</p> : null}
      <form action={loginCustomer} className="mt-8 space-y-3 rounded-[1.7rem] border border-[#eee0e6] bg-white p-6">
        <input type="hidden" name="next" value={dest} />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border px-4 py-3" />
        <input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border px-4 py-3" />
        <button className="w-full rounded-full bg-brown py-3 text-cream">Se connecter</button>
      </form>
      <p className="mt-6 text-sm text-black/60">
        <Link href="/compte/inscription" className="underline">
          Créer un compte cliente
        </Link>
      </p>
    </div>
  );
}
