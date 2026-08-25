import { requireStaff } from "@/lib/guard";
import { searchPosProducts } from "@/app/actions/pos";
import { getOpenSessionForUser, getTillSnapshot } from "@/services/cash.service";
import { PosClient } from "@/components/pos/pos-client";
import { TillBoard } from "@/components/pos/till-board";
import { StaffToolbar } from "@/components/staff/toolbar";
import { getShopSettings, toReceiptShop } from "@/lib/settings";
import { BrandLockup } from "@/components/brand/logo";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import type { HeldTicketPayload } from "@/lib/pos";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; ok?: string }>;
}) {
  const session = await requireStaff("pos.access");
  const q = await searchParams;
  const notice = q.erreur
    ? ({ kind: "erreur" as const, text: q.erreur })
    : q.ok
      ? ({ kind: "ok" as const, text: q.ok })
      : null;
  const [products, open, settings, expenseCategories, heldRows] = await Promise.all([
    searchPosProducts(""),
    getOpenSessionForUser(session.userId),
    getShopSettings(),
    prisma.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.heldTicket.findMany({
      where: { cashierId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, note: true, createdAt: true, payload: true },
    }),
  ]);
  const snapshot = open ? await getTillSnapshot(open.id) : null;
  return (
    <div className="min-h-screen bg-background">
      <StaffToolbar />
      <div className="p-4 md:p-8">
        <BrandLockup size="md" subtitle="Caisse · Point de vente" priority />
        <h1 className="sr-only">Caisse NERA</h1>
        <p className="mt-1 text-sm text-black/60">
          {session.firstName} {session.lastName}
        </p>
        <div className="mt-3">
          <PayDeliveryBadges compact />
        </div>
        <p className="mt-2 text-xs text-black/45">
          {settings.email} · MoMo {settings.mtnPhone} · RCCM {settings.rccm} · NUI {settings.nui}
        </p>
        {notice ? (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              notice.kind === "erreur"
                ? "border border-red-200 bg-red-50 text-red-800"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
            role={notice.kind === "erreur" ? "alert" : "status"}
          >
            {notice.text}
          </p>
        ) : null}
        <div className="mt-6 space-y-6">
          {snapshot ? <TillBoard snapshot={snapshot} categories={expenseCategories} /> : null}
          <PosClient
            initial={products}
            openSession={open ? { id: open.id, openingFloat: open.openingFloat } : null}
            shop={toReceiptShop(settings)}
            canRefund={hasPermission(session, "sales.refund")}
            initialHeld={heldRows.map((row) => ({
              id: row.id,
              note: row.note,
              createdAt: row.createdAt,
              payload: row.payload as HeldTicketPayload,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
