export type TillSale = {
  status: string;
  total: number;
  payments: { method: string; status: string; amount: number }[];
};

export type TillExpense = {
  id: string;
  amount: number;
  description: string | null;
  categoryName: string;
};

export type TillSnapshot = {
  sessionId: string;
  openingFloat: number;
  salesCount: number;
  salesTotal: number;
  cashSales: number;
  otherSales: number;
  expensesTotal: number;
  expenses: TillExpense[];
  netRevenue: number;
  expectedCash: number;
};

export function summarizeTill(input: {
  sessionId: string;
  openingFloat: number;
  sales: TillSale[];
  expenses: TillExpense[];
}): TillSnapshot {
  const completed = input.sales.filter((s) => s.status === "COMPLETED");
  const salesTotal = completed.reduce((sum, s) => sum + s.total, 0);
  let cashSales = 0;
  let otherSales = 0;
  for (const sale of completed) {
    const paid = sale.payments.filter((p) => p.status === "COMPLETED");
    const other = paid.filter((p) => p.method !== "CASH").reduce((sum, p) => sum + p.amount, 0);
    const cash = paid.filter((p) => p.method === "CASH").reduce((sum, p) => sum + p.amount, 0);
    const otherCounted = Math.min(Math.max(0, other), sale.total);
    const cashDue = Math.max(0, sale.total - otherCounted);
    otherSales += otherCounted;
    cashSales += Math.min(Math.max(0, cash), cashDue);
  }
  const expensesTotal = input.expenses.reduce((sum, e) => sum + e.amount, 0);
  return {
    sessionId: input.sessionId,
    openingFloat: input.openingFloat,
    salesCount: completed.length,
    salesTotal,
    cashSales,
    otherSales,
    expensesTotal,
    expenses: input.expenses,
    netRevenue: salesTotal - expensesTotal,
    expectedCash: input.openingFloat + cashSales - expensesTotal,
  };
}

/**
 * Montant d’espèces à enregistrer comme sortie sur la caisse *courante*
 * lorsqu’on rembourse/annule une vente dont la session d’origine n’est plus ouverte.
 * Si la session d’origine est encore OPEN, summarizeTill retire déjà la vente du tiroir.
 */
export function cashReturnTillExpenseAmount(
  cashPortion: number,
  originalSessionStatus: string | null | undefined,
) {
  if (!Number.isFinite(cashPortion) || cashPortion <= 0) return 0;
  if (originalSessionStatus === "OPEN") return 0;
  return Math.round(cashPortion);
}

export function canCloseCashSession(input: {
  openedById: string;
  userId: string;
  isSuperAdmin?: boolean;
}) {
  return input.openedById === input.userId || Boolean(input.isSuperAdmin);
}

/** Fond proposé à la réouverture : l’argent encore dans le tiroir. */
export function nextOpeningFloatFromClose(input: {
  actualCash?: number | null;
  expectedCash?: number | null;
}) {
  if (input.actualCash != null && Number.isFinite(input.actualCash) && input.actualCash >= 0) {
    return Math.round(input.actualCash);
  }
  if (input.expectedCash != null && Number.isFinite(input.expectedCash) && input.expectedCash >= 0) {
    return Math.round(input.expectedCash);
  }
  return 0;
}
