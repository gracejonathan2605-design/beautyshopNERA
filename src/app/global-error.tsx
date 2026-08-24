"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "serif", background: "#fffcfb", color: "#2a1f24", padding: "4rem 1.5rem", textAlign: "center" }}>
        <h1>NERA Beauté & Shop</h1>
        <p>Erreur serveur. Vérifiez les variables d’environnement Vercel (DATABASE_URL, AUTH_SECRET).</p>
        <p style={{ fontSize: 12, opacity: 0.5 }}>{error.digest ?? error.message}</p>
        <button type="button" onClick={reset} style={{ marginTop: 24, padding: "12px 24px", borderRadius: 999, background: "#c45c74", color: "#fffdfb", border: 0 }}>
          Réessayer
        </button>
      </body>
    </html>
  );
}
