import { formatCfa } from "@/lib/money";
import { nextOpeningFloatFromClose } from "@/lib/till";

export function TillCloseRecap({
  session,
}: {
  session: {
    openingFloat: number;
    expectedCash: number | null;
    actualCash: number | null;
    difference: number | null;
    closedAt: Date | null;
    openedBy: { firstName: string; lastName: string };
  };
}) {
  const expected = session.expectedCash ?? 0;
  const counted = session.actualCash ?? expected;
  const difference = session.difference ?? counted - expected;
  const gap =
    difference === 0 ? formatCfa(0) : `${difference > 0 ? "+" : "−"}${formatCfa(Math.abs(difference))}`;
  const when = session.closedAt
    ? session.closedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;
  const who = `${session.openedBy.firstName} ${session.openedBy.lastName}`.trim();
  const nextFloat = nextOpeningFloatFromClose({ actualCash: session.actualCash, expectedCash: session.expectedCash });

  return (
    <section className="rounded-[1.7rem] border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="font-serif text-2xl text-wine">Dernière fermeture</h2>
      <p className="mt-1 text-sm text-black/60">
        {who ? `Caisse de ${who}` : "Caisse"}
        {when ? ` fermée à ${when}` : " fermée"}. Vous pouvez la rouvrir tout de suite avec le fond ci-dessous.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Fond d’ouverture</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(session.openingFloat)}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Espèces attendues</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(expected)}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Espèces comptées</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{formatCfa(counted)}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-black/45">Écart</dt>
          <dd className="mt-1 font-serif text-2xl text-wine">{gap}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-black/55">
        Fond proposé pour la prochaine ouverture : <strong>{formatCfa(nextFloat)}</strong> (argent resté dans le
        tiroir).
      </p>
    </section>
  );
}
