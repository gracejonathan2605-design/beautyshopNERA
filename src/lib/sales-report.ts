const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function reportDay(date: Date) {
  return new Date(date.getTime() + HOUR).toISOString().slice(0, 10);
}

function dayStart(day: string) {
  const date = new Date(`${day}T00:00:00+01:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime()) || reportDay(date) !== day) {
    return null;
  }
  return date;
}

export function salesReportRange(preset: string, from?: string, to?: string, now = new Date()) {
  const today = dayStart(reportDay(now))!;
  if (preset === "custom") {
    const start = from && dayStart(from);
    const end = to && dayStart(to);
    if (!start || !end || start > end) return null;
    return { from: start, to: new Date(end.getTime() + DAY - 1) };
  }
  let start = today;
  if (preset === "week") {
    const weekday = new Date(today.getTime() + HOUR).getUTCDay();
    start = new Date(today.getTime() - ((weekday + 6) % 7) * DAY);
  } else if (preset === "month") {
    start = dayStart(`${reportDay(now).slice(0, 7)}-01`)!;
  } else if (preset === "7d" || preset === "30d") {
    start = new Date(today.getTime() - (preset === "7d" ? 6 : 29) * DAY);
  }
  return { from: start, to: new Date(today.getTime() + DAY - 1) };
}

export type ReportLine = {
  quantity: number;
  unitCost: number | null;
  variant: { costPrice: number; product: { stockOwner: string } };
};

type ReportSale = { createdAt: Date; total: number; items: ReportLine[] };
type ReportExpense = { date: Date; amount: number; category: { slug: string }; description: string | null; cashSessionId: string | null };

export function summarizeSalesReport(
  sales: ReportSale[],
  expenses: ReportExpense[],
  reversedSaleNumbers: Set<string>,
) {
  const days = new Map<string, { day: string; revenue: number; cost: number; expenses: number; profit: number }>();
  let historicalLines = 0;
  let missingCostLines = 0;
  let partnerLines = 0;
  const rowFor = (date: Date) => {
    const day = reportDay(date);
    let row = days.get(day);
    if (!row) {
      row = { day, revenue: 0, cost: 0, expenses: 0, profit: 0 };
      days.set(day, row);
    }
    return row;
  };
  for (const sale of sales) {
    const row = rowFor(sale.createdAt);
    row.revenue += sale.total;
    for (const item of sale.items) {
      const cost = item.unitCost ?? item.variant.costPrice;
      row.cost += cost * item.quantity;
      if (item.unitCost === null) historicalLines++;
      if (cost === 0) missingCostLines++;
      if (item.variant.product.stockOwner === "PARTNER") partnerLines++;
    }
  }
  for (const expense of expenses) {
    if (expense.category.slug === "achat-marchandises") continue;
    const match = expense.cashSessionId && expense.description?.match(/^(?:Remboursement|Annulation) (.+)$/);
    if (match && reversedSaleNumbers.has(match[1])) continue;
    rowFor(expense.date).expenses += expense.amount;
  }
  const daily = [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
  const totals = { revenue: 0, cost: 0, expenses: 0, profit: 0 };
  for (const row of daily) {
    row.profit = row.revenue - row.cost - row.expenses;
    totals.revenue += row.revenue;
    totals.cost += row.cost;
    totals.expenses += row.expenses;
    totals.profit += row.profit;
  }
  return { daily, totals, historicalLines, missingCostLines, partnerLines };
}
