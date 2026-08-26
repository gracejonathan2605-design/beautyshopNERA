"use client";

import Link from "next/link";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const raw = error.digest ?? "";
  const uploadFail = /failed to fetch/i.test(raw);
  return (
    <div className="rounded-2xl border border-[#eee0e6] bg-white p-8">
      <h1 className="font-serif text-3xl text-wine">Cette page n’a pas pu s’afficher</h1>
      <p className="mt-3 max-w-xl text-sm text-black/60">
        {uploadFail
          ? "L’envoi du fichier a été coupé : la photo ou la vidéo est trop lourde pour le serveur. Ce n’est pas un problème de base de données. Revenez aux produits, envoyez 1 photo (pas HEIC), sans vidéo."
          : "Réessayez. Si le problème continue, vérifiez la connexion à la base de données."}
      </p>
      <p className="mt-2 text-xs text-black/40">{error.digest ? `Réf. ${error.digest}` : "Réessayez dans un instant."}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-brown px-5 py-2 text-cream">
          Réessayer
        </button>
        {uploadFail ? (
          <Link href="/admin/produits" className="rounded-full border border-brown px-5 py-2 text-sm text-brown">
            Retour aux produits
          </Link>
        ) : null}
      </div>
    </div>
  );
}
