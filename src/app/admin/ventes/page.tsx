import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { formatCfa } from "@/lib/money";
import { SALE_STATUS_LABELS } from "@/lib/status-labels";
import { PAYMENT_LABELS } from "@/lib/receipt";
import { hasPermission } from "@/lib/permissions";
import { cancelPosSale, refundPosSaleForm } from "@/app/actions/pos";
import Link from "next/link";

function formatWhen(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SalesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("sales.view");
  const canCancel = hasPermission(session, "sales.cancel");
  const canRefund = hasPermission(session, "sales.refund");
  const { ok, erreur } = await searchParams;
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      createdAt: true,
      cashier: { select: { firstName: true, lastName: true } },
      payments: { select: { method: true } },
    },
    take: 100,
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Ventes POS</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Tickets encaissés à la caisse. Pour enregistrer une vente, ouvrez{" "}
        <Link href="/pos" className="underline">
          Caisse POS
        </Link>
        .
      </p>
      {ok ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p> : null}
      {erreur ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</p> : null}
      {sales.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#eee0e6] bg-white p-8">
          <p className="font-medium text-wine">Aucune vente pour le moment</p>
          <p className="mt-2 text-sm text-black/55">
            Dès qu’un ticket est encaissé à la caisse, il apparaît ici.
          </p>
          <Link href="/pos" className="mt-5 inline-block rounded-full bg-brown px-5 py-2 text-sm text-cream">
            Ouvrir la caisse
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {sales.map((s) => {
            const cashierName = s.cashier
              ? `${s.cashier.firstName ?? ""} ${s.cashier.lastName ?? ""}`.trim()
              : "Caisse";
            const methods = s.payments
              .map((p) => PAYMENT_LABELS[p.method] ?? p.method)
              .join(" · ");
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream p-4">
                <div>
                  <p className="font-medium">{s.number}</p>
                  <p className="text-sm text-black/50">
                    {formatWhen(s.createdAt)} · {cashierName}
                    {methods ? ` · ${methods}` : ""} · {SALE_STATUS_LABELS[s.status] ?? s.status}
                  </p>
                </div>
                <span className="flex items-center gap-3">
                  <span className="font-serif text-xl text-wine">{formatCfa(s.total)}</span>
                  {canRefund && s.status === "COMPLETED" ? (
                    <form action={refundPosSaleForm}>
                      <input type="hidden" name="saleId" value={s.id} />
                      <button className="text-sm text-wine">Rembourser</button>
                    </form>
                  ) : null}
                  {canCancel && s.status === "COMPLETED" ? (
                    <form action={cancelPosSale}>
                      <input type="hidden" name="saleId" value={s.id} />
                      <button className="text-sm text-red-700">Annuler</button>
                    </form>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
