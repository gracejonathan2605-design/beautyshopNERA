export default function ForbiddenPage() {
  return (
    <div className="rounded-2xl bg-cream p-8">
      <h1 className="font-serif text-3xl">Accès refusé</h1>
      <p className="mt-2 text-black/60">Votre rôle ne permet pas d’ouvrir cette page.</p>
    </div>
  );
}
