import Link from "next/link";
import { loginStaff } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; hint?: string }>;
}) {
  const { error, next, hint } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form action={loginStaff} className="w-full max-w-md rounded-3xl bg-cream p-8 shadow-sm">
        <p className="font-serif text-4xl text-brown">NERA</p>
        <h1 className="mt-2 text-lg">Connexion équipe</h1>
        <p className="mt-2 text-sm text-black/50">
          Espace administration et caisse. Les clientes utilisent Compte dans la boutique.
        </p>
        {hint === "staff" ? (
          <p className="mt-3 text-sm text-brown">
            Ce compte appartient à l’équipe. Connectez-vous ici.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-700">Identifiants incorrects.</p> : null}
        <input type="hidden" name="next" value={next ?? "/admin"} />
        <input name="email" type="email" required placeholder="Email" className="mt-6 w-full rounded-xl border px-4 py-3" />
        <input name="password" type="password" required placeholder="Mot de passe" className="mt-3 w-full rounded-xl border px-4 py-3" />
        <button className="mt-6 w-full rounded-full bg-brown py-3 text-cream">Entrer</button>
        <p className="mt-6 text-center text-sm text-black/50">
          <Link href="/compte/connexion" className="underline">Compte cliente</Link>
          {" · "}
          <Link href="/" className="underline">Boutique</Link>
        </p>
      </form>
    </div>
  );
}
