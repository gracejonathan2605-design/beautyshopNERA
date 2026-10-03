import { loginCustomer } from "@/app/actions/auth";
import { BrandLogo } from "@/components/brand/logo";
import { MaisonPageHead } from "@/components/shop/maison-hero";
import { PasswordField } from "@/components/shop/password-field";
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
    <>
      <MaisonPageHead kicker="Espace cliente" title="Connexion" />
      <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <BrandLogo size="md" />
      </div>
      {error === "busy" ? (
        <p className="mt-3 text-sm text-red-700">
          La boutique est saturée un instant. Réessayez, ou connectez-vous en équipe via{" "}
          <Link href="/login" className="underline">
            Connexion caisse / admin
          </Link>
          .
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-700">Identifiants incorrects.</p>
      ) : null}
      <form action={loginCustomer} className="mt-8 space-y-3 rounded-[1.7rem] border border-[#eee0e6] bg-white p-6">
        <input type="hidden" name="next" value={dest} />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border px-4 py-3" />
        <PasswordField required autoComplete="current-password" placeholder="Mot de passe" />
        <button className="w-full rounded-full bg-brown py-3 text-cream">Se connecter</button>
      </form>
      <p className="mt-6 text-sm text-black/60">
        <Link href="/compte/inscription" className="underline">
          Créer un compte cliente
        </Link>
        . Les commandes passées avec le même téléphone seront rattachées automatiquement.
      </p>
      <p className="mt-3 text-sm text-black/60">
        Équipe NERA (caisse, administration) :{" "}
        <Link href="/login" className="underline">
          connexion équipe
        </Link>
        .
      </p>
    </div>
    </>
  );
}
