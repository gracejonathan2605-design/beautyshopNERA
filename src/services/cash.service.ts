import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { summarizeTill, type TillSnapshot } from "@/lib/till";

const tillSaleSelect = {
  status: true,
  total: true,
  payments: { select: { method: true, status: true, amount: true } },
} as const;

export async function openCashSession(input: {
  registerId: string;
  userId: string;
  openingFloat: number;
}) {
  if (!Number.isFinite(input.openingFloat) || input.openingFloat < 0) {
    throw new Error("Fond d’ouverture invalide.");
  }
  const mine = await prisma.cashSession.findFirst({
    where: { registerId: input.registerId, status: "OPEN", openedById: input.userId },
  });
  if (mine) return mine;

  const existing = await prisma.cashSession.findFirst({
    where: { registerId: input.registerId, status: "OPEN" },
  });
  if (existing) {
    throw new Error("Cette caisse est déjà ouverte par une autre vendeuse. Fermez-la avant d’en ouvrir une autre.");
  }

  try {
    const session = await prisma.cashSession.create({
      data: {
        registerId: input.registerId,
        openedById: input.userId,
        openingFloat: Math.round(input.openingFloat),
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await prisma.cashSession.findFirst({
        where: { registerId: input.registerId, status: "OPEN" },
      });
      if (raced) {
        if (raced.openedById === input.userId) return raced;
        throw new Error("Cette caisse est déjà ouverte par une autre vendeuse. Fermez-la avant d’en ouvrir une autre.");
      }
    }
    throw err;
  }
}

export async function getTillSnapshot(sessionId: string): Promise<TillSnapshot | null> {
  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      openingFloat: true,
      sales: { select: tillSaleSelect },
      expenses: {
        select: { id: true, amount: true, description: true, category: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!session) return null;
  return summarizeTill({
    sessionId: session.id,
    openingFloat: session.openingFloat,
    sales: session.sales,
    expenses: session.expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      categoryName: e.category.name,
    })),
  });
}

export async function closeCashSession(input: {
  sessionId: string;
  userId: string;
  actualCash?: number | null;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.cashSession.findUnique({
      where: { id: input.sessionId },
      select: {
        id: true,
        status: true,
        openedById: true,
        openingFloat: true,
        sales: { select: tillSaleSelect },
        expenses: { select: { id: true, amount: true, description: true, category: { select: { name: true } } } },
      },
    });
    if (!session || session.status !== "OPEN") {
      throw new Error("Session introuvable ou déjà close");
    }

    const snap = summarizeTill({
      sessionId: session.id,
      openingFloat: session.openingFloat,
      sales: session.sales,
      expenses: session.expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        categoryName: e.category.name,
      })),
    });
    const expectedCash = snap.expectedCash;
    const actualCash =
      input.actualCash == null || !Number.isFinite(input.actualCash) ? expectedCash : input.actualCash;
    if (actualCash < 0) throw new Error("Le cash réel ne peut pas être négatif.");
    const difference = actualCash - expectedCash;

    const closed = await tx.cashSession.update({
      where: { id: session.id },
      data: {
        status: "CLOSED",
        closedById: input.userId,
        closedAt: new Date(),
        expectedCash,
        actualCash,
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
        after: {
          expectedCash,
          actualCash,
          difference,
          salesTotal: snap.salesTotal,
          expensesTotal: snap.expensesTotal,
        },
      },
    });

    return closed;
  });
}

const sessionInclude = {
  register: { include: { location: true } },
  openedBy: { select: { firstName: true, lastName: true } },
} as const;

export async function getOpenSessionForUser(userId: string) {
  return prisma.cashSession.findFirst({
    where: { status: "OPEN", openedById: userId },
    include: sessionInclude,
    orderBy: { openedAt: "desc" },
  });
}

export async function getOccupiedCashSession(exceptUserId: string) {
  return prisma.cashSession.findFirst({
    where: { status: "OPEN", openedById: { not: exceptUserId } },
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

export async function recordTillExpense(input: {
  userId: string;
  amount: number;
  description: string;
  categoryId?: string | null;
}) {
  if (input.amount <= 0) throw new Error("Indiquez le montant de la dépense.");
  const open = await getOpenSessionForUser(input.userId);
  if (!open) throw new Error("Ouvrez d’abord la caisse.");
  let categoryId = input.categoryId || "";
  if (!categoryId) {
    const fallback = await prisma.expenseCategory.findFirst({
      where: { isActive: true, OR: [{ slug: "autre" }, { name: "Autre" }] },
    });
    const any = fallback ?? (await prisma.expenseCategory.findFirst({ where: { isActive: true } }));
    if (!any) throw new Error("Aucune catégorie de dépense. Créez-en une dans Admin → Dépenses.");
    categoryId = any.id;
  }
  const expense = await prisma.expense.create({
    data: {
      categoryId,
      amount: input.amount,
      date: new Date(),
      description: input.description || "Dépense caisse",
      userId: input.userId,
      cashSessionId: open.id,
    },
  });
  await writeAudit({
    userId: input.userId,
    action: "TILL_EXPENSE",
    entity: "Expense",
    entityId: expense.id,
    after: { amount: input.amount, cashSessionId: open.id },
  });
  return expense;
}
