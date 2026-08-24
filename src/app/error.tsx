"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-brown">NERA Beauté & Shop</p>
      <h1 className="mt-4 font-serif text-4xl">La page n’a pas pu s’afficher</h1>
      <p className="mt-4 text-black/70">
        Le site est déployé, mais le serveur n’a pas pu charger les données. Sur Vercel, vérifiez
        <span className="font-medium"> DATABASE_URL</span>, <span className="font-medium">DIRECT_URL</span> et
        <span className="font-medium"> AUTH_SECRET</span>.
      </p>
      <p className="mt-2 text-xs text-black/40">{error.digest ?? error.message}</p>
      <button type="button" onClick={reset} className="mt-8 rounded-full bg-brown px-6 py-3 text-cream">
        Réessayer
      </button>
    </div>
  );
}
