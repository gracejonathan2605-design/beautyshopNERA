import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { canCloseCashSession, countedCashFromClose, summarizeTill, type TillSnapshot } from "@/lib/till";

const tillSaleSelect = {
  status: true,
  total: true,
  payments: { select: { method: true, status: true, amount: true } },
} as const;

export async function lockCashSessionRow(
  tx: Prisma.TransactionClient,
  sessionId: string,
) {
  const rows = await tx.$queryRaw<{ id: string; status: string; openedById: string }[]>`
    SELECT id, status, "openedById" FROM "CashSession" WHERE id = ${sessionId} FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function lockOpenCashSession(
  tx: Prisma.TransactionClient,
  sessionId: string,
  closedMessage = "La caisse n’est plus ouverte.",
) {
  const row = await lockCashSessionRow(tx, sessionId);
  if (!row || row.status !== "OPEN") {
    throw new Error(closedMessage);
  }
  return row;
}

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
    await lockOpenCashSession(tx, input.sessionId, "Session introuvable ou déjà close");
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
    const counted = input.actualCash;
    if (counted != null && (!Number.isFinite(counted) || counted < 0)) {
      throw new Error("Le cash réel ne peut pas être négatif.");
    }
    const actualCash = countedCashFromClose({ counted, expectedCash });
    const difference = actualCash - expectedCash;

    const closed = await tx.cashSession.updateMany({
      where: { id: session.id, status: "OPEN" },
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
    if (closed.count !== 1) {
      throw new Error("Session introuvable ou déjà close");
    }

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

    return {
      id: session.id,
      expectedCash,
      actualCash,
      difference,
      salesTotal: snap.salesTotal,
      expensesTotal: snap.expensesTotal,
      openingFloat: session.openingFloat,
    };
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

export async function getOpenCashSessionById(sessionId: string) {
  if (!sessionId) return null;
  return prisma.cashSession.findFirst({
    where: { id: sessionId, status: "OPEN" },
    include: sessionInclude,
  });
}

export async function getLastClosedSessionForUser(userId: string) {
  return prisma.cashSession.findFirst({
    where: {
      status: "CLOSED",
      OR: [{ openedById: userId }, { closedById: userId }],
    },
    orderBy: { closedAt: "desc" },
    select: {
      id: true,
      openingFloat: true,
      expectedCash: true,
      actualCash: true,
      difference: true,
      closedAt: true,
      openedAt: true,
      openedBy: { select: { firstName: true, lastName: true } },
    },
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

export async function resolveTillExpenseCategoryId(
  tx: Prisma.TransactionClient,
  requestedId?: string | null,
) {
  if (requestedId) {
    const found = await tx.expenseCategory.findFirst({
      where: { id: requestedId, isActive: true },
      select: { id: true },
    });
    if (found) return found.id;
  }
  const fallback = await tx.expenseCategory.upsert({
    where: { slug: "autre" },
    update: { isActive: true, name: "Autre" },
    create: { name: "Autre", slug: "autre" },
    select: { id: true },
  });
  return fallback.id;
}

export async function recordTillExpense(input: {
  userId: string;
  amount: number;
  description: string;
  categoryId?: string | null;
  sessionId?: string | null;
  isSuperAdmin?: boolean;
  canForce?: boolean;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Indiquez le montant de la dépense.");
  }
  const description = input.description.trim();
  if (!description) throw new Error("Indiquez le motif de la dépense (taxi, eau, etc.).");

  const amount = Math.round(input.amount);
  const expense = await prisma.$transaction(async (tx) => {
    const found = input.sessionId
      ? await tx.cashSession.findFirst({
          where: { id: input.sessionId, status: "OPEN" },
          select: { id: true, openedById: true },
        })
      : await tx.cashSession.findFirst({
          where: { status: "OPEN", openedById: input.userId },
          select: { id: true, openedById: true },
          orderBy: { openedAt: "desc" },
        });
    if (!found) throw new Error("Ouvrez d’abord la caisse.");
    const open = await lockOpenCashSession(tx, found.id, "La caisse n’est plus ouverte. Rouvrez-la puis enregistrez la dépense.");
    if (
      !canCloseCashSession({
        openedById: open.openedById,
        userId: input.userId,
        isSuperAdmin: input.isSuperAdmin,
        canForce: input.canForce,
      })
    ) {
      throw new Error("Cette dépense doit être saisie sur la caisse ouverte.");
    }

    const categoryId = await resolveTillExpenseCategoryId(tx, input.categoryId);
    const row = await tx.expense.create({
      data: {
        categoryId,
        amount,
        date: new Date(),
        description,
        userId: input.userId,
        cashSessionId: open.id,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "TILL_EXPENSE",
        entity: "Expense",
        entityId: row.id,
        after: { amount, cashSessionId: open.id, description },
      },
    });
    return row;
  });

  const snapshot = await getTillSnapshot(expense.cashSessionId ?? "");
  if (!snapshot) throw new Error("Dépense enregistrée, mais la caisse n’a pas pu être relue.");
  return { expense, snapshot };
}
