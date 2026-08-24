import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginStaff } from "@/app/actions/auth";
import { getStaffSession } from "@/lib/auth";
import { defaultStaffPath } from "@/lib/permissions";
import { BrandLogo } from "@/components/brand/logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Connexion équipe — NERA",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; hint?: string }>;
}) {
  const { error, next, hint } = await searchParams;
  const existing = await getStaffSession().catch(() => null);
  if (existing) {
    const requested = next?.startsWith("/") ? next : defaultStaffPath(existing);
    redirect(requested);
  }

  return (
    <div className="hero-light flex min-h-screen items-center justify-center px-4">
      <form action={loginStaff} className="w-full max-w-md rounded-[2rem] border border-[#eee0e6] bg-white/90 p-8 shadow-[0_24px_60px_-36px_rgba(58,36,48,0.35)]">
        <div className="flex justify-center">
          <BrandLogo size="lg" priority />
        </div>
        <p className="mt-5 text-center text-xs uppercase tracking-[0.28em] text-gold">Équipe</p>
        <h1 className="mt-2 text-center font-serif text-4xl text-wine">Connexion</h1>
        <p className="mt-2 text-center text-lg text-black/70">Caisse & administration</p>
        <p className="mt-2 text-sm text-black/50">
          Réservé à la vendeuse et à l’administratrice. Les clientes se connectent via Compte.
        </p>
        {hint === "staff" ? (
          <p className="mt-3 text-sm text-brown">
            Ce compte appartient à l’équipe. Connectez-vous ici.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-700">Identifiants incorrects.</p> : null}
        <input type="hidden" name="next" value={next ?? "/admin"} />
        <input name="email" type="email" required placeholder="Email" className="mt-6 w-full rounded-xl border border-[#eee0e6] px-4 py-3" />
        <input name="password" type="password" required placeholder="Mot de passe" className="mt-3 w-full rounded-xl border border-[#eee0e6] px-4 py-3" />
        <button className="mt-6 w-full rounded-full bg-brown py-3 text-cream">Entrer</button>
        <p className="mt-6 text-center text-sm text-black/50">
          <Link href="/" className="underline">Retour à la boutique</Link>
        </p>
      </form>
    </div>
  );
}
