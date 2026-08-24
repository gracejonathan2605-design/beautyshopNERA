import { loginCustomer } from "@/app/actions/auth";
import Link from "next/link";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-5xl">Connexion</h1>
      {error ? <p className="mt-3 text-sm text-red-700">Identifiants incorrects.</p> : null}
      <form action={loginCustomer} className="mt-8 space-y-3">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border px-4 py-3" />
        <input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border px-4 py-3" />
        <button className="w-full rounded-full bg-brown py-3 text-cream">Se connecter</button>
      </form>
      <p className="mt-6 text-sm text-black/60">
        <Link href="/compte/inscription" className="underline">
          Créer un compte cliente
        </Link>
        {" · "}
        <Link href="/login" className="underline">
          Espace équipe
        </Link>
      </p>
    </div>
  );
}
