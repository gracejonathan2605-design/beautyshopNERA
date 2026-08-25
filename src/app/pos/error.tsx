"use client";

export default function PosErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-lg rounded-2xl border border-[#eee0e6] bg-white p-8">
        <h1 className="font-serif text-3xl text-wine">La caisse n’a pas pu s’ouvrir</h1>
        <p className="mt-3 text-sm text-black/60">
          Réessayez. Si le problème continue, reconnectez-vous puis ouvrez à nouveau la caisse.
        </p>
        <p className="mt-2 text-xs text-black/40">{error.digest ?? error.message}</p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-brown px-5 py-2 text-cream">
          Réessayer
        </button>
      </div>
    </div>
  );
}
