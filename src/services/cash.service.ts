import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function openCashSession(input: {
  registerId: string;
  userId: string;
  openingFloat: number;
}) {
  const existing = await prisma.cashSession.findFirst({
    where: { registerId: input.registerId, status: "OPEN" },
  });
  if (existing) throw new Error("Une session est déjà ouverte sur cette caisse");

  const session = await prisma.cashSession.create({
    data: {
      registerId: input.registerId,
      openedById: input.userId,
      openingFloat: input.openingFloat,
    },
  });

  await writeAudit({
    userId: input.userId,
    action: "CASH_OPEN",
    entity: "CashSession",
    entityId: session.id,
    after: { openingFloat: input.openingFloat },
  });

  return session;
}

export async function closeCashSession(input: {
  sessionId: string;
  userId: string;
  actualCash: number;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.cashSession.findUnique({
      where: { id: input.sessionId },
      include: {
        sales: { include: { payments: true } },
      },
    });
    if (!session || session.status !== "OPEN") {
      throw new Error("Session introuvable ou déjà close");
    }

    const cashIn = session.sales
      .filter((s) => s.status === "COMPLETED")
      .flatMap((s) => s.payments)
      .filter((p) => p.method === "CASH" && p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    const cashOut = session.sales
      .filter((s) => s.status === "CANCELLED" || s.status === "REFUNDED")
      .flatMap((s) => s.payments)
      .filter((p) => p.method === "CASH")
      .reduce((sum, p) => sum + p.amount, 0);

    const expectedCash = session.openingFloat + cashIn - cashOut;
    const difference = input.actualCash - expectedCash;

    const closed = await tx.cashSession.update({
      where: { id: session.id },
      data: {
        status: "CLOSED",
        closedById: input.userId,
        closedAt: new Date(),
        expectedCash,
        actualCash: input.actualCash,
        difference,
        notes: input.notes,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "CASH_CLOSE",
        entity: "CashSession",
        entityId: session.id,
        after: { expectedCash, actualCash: input.actualCash, difference },
      },
    });

    return closed;
  });
}

export async function getOpenSessionForUser(userId: string) {
  return prisma.cashSession.findFirst({
    where: { status: "OPEN", openedById: userId },
    include: { register: { include: { location: true } } },
    orderBy: { openedAt: "desc" },
  });
}
