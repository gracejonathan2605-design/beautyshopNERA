"use client";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#eee0e6] bg-white p-8">
      <h1 className="font-serif text-3xl text-wine">Cette page n’a pas pu s’afficher</h1>
      <p className="mt-3 max-w-xl text-sm text-black/60">
        Réessayez. Si le problème continue, vérifiez la connexion à la base de données.
      </p>
      <p className="mt-2 text-xs text-black/40">{error.digest ?? error.message}</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-brown px-5 py-2 text-cream">
        Réessayer
      </button>
    </div>
  );
}
