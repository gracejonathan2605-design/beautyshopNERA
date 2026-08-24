import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function openCashSession(input: {
  registerId: string;
  userId: string;
  openingFloat: number;
}) {
  const mine = await prisma.cashSession.findFirst({
    where: { registerId: input.registerId, status: "OPEN", openedById: input.userId },
  });
  if (mine) return mine;

  const existing = await prisma.cashSession.findFirst({
    where: { registerId: input.registerId, status: "OPEN" },
  });
  if (existing) return existing;

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

const sessionInclude = { register: { include: { location: true } } } as const;

export async function getOpenSessionForUser(userId: string) {
  const mine = await prisma.cashSession.findFirst({
    where: { status: "OPEN", openedById: userId },
    include: sessionInclude,
    orderBy: { openedAt: "desc" },
  });
  if (mine) return mine;
  return prisma.cashSession.findFirst({
    where: { status: "OPEN", register: { isActive: true } },
    include: sessionInclude,
    orderBy: { openedAt: "desc" },
  });
}

export async function ensureOpenCashSession(userId: string, openingFloat = 0) {
  const open = await getOpenSessionForUser(userId);
  if (open) return open;
  const register = await prisma.cashRegister.findFirst({
    where: { isActive: true },
    include: { location: true },
  });
  if (!register) throw new Error("Aucune caisse configurée");
  const created = await openCashSession({
    registerId: register.id,
    userId,
    openingFloat,
  });
  return prisma.cashSession.findUniqueOrThrow({
    where: { id: created.id },
    include: sessionInclude,
  });
}
