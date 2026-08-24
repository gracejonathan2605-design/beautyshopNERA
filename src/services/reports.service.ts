import { startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export type ReportRange = {
  from: Date;
  to: Date;
};

export function rangeFromPreset(preset: string, from?: string, to?: string): ReportRange {
  const now = new Date();
  if (preset === "custom" && from && to) {
    return { from: new Date(from), to: new Date(to) };
  }
  if (preset === "7d") return { from: subDays(now, 7), to: now };
  if (preset === "30d") return { from: subDays(now, 30), to: now };
  if (preset === "month") return { from: startOfMonth(now), to: now };
  if (preset === "week") return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
  return { from: startOfDay(now), to: now };
}

export async function getDashboardMetrics(range: ReportRange) {
  const { from, to } = range;
  const [posSales, orders, expenses, lowStockRows] = await Promise.all([
    prisma.sale.findMany({
      where: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
      include: { items: { include: { variant: true } }, payments: true },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { notIn: ["CANCELLED"] },
      },
      include: { items: { include: { variant: true } } },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint as count FROM "Inventory" WHERE "onHand" - "reserved" <= "minQuantity"`,
  ]);

  const posRevenue = posSales.reduce((s, sale) => s + sale.total, 0);
  const onlineRevenue = orders
    .filter((o) => !["CANCELLED", "PENDING"].includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const revenue = posRevenue + onlineRevenue;

  let cogs = 0;
  for (const sale of posSales) {
    for (const item of sale.items) cogs += item.variant.costPrice * item.quantity;
  }
  for (const order of orders.filter((o) => ["SHIPPED", "DELIVERED"].includes(o.status))) {
    for (const item of order.items) cogs += item.variant.costPrice * item.quantity;
  }

  const expenseTotal = expenses._sum.amount ?? 0;
  const profit = revenue - cogs - expenseTotal;
  const ticketCount = posSales.length + orders.length;
  const averageBasket = ticketCount ? Math.round(revenue / ticketCount) : 0;

  const low = lowStockRows;

  const top = await prisma.$queryRaw<
    { name: string; sku: string; qty: bigint; amount: number }[]
  >`
    SELECT i."productName" as name, i.sku, SUM(i.quantity)::bigint as qty, SUM(i.total)::int as amount
    FROM "SaleItem" i
    JOIN "Sale" s ON s.id = i."saleId"
    WHERE s.status = 'COMPLETED' AND s."createdAt" BETWEEN ${from} AND ${to}
    GROUP BY i."productName", i.sku
    ORDER BY qty DESC
    LIMIT 8
  `;

  return {
    revenue,
    posRevenue,
    onlineRevenue,
    posCount: posSales.length,
    orderCount: orders.length,
    averageBasket,
    cogs,
    expenseTotal,
    profit,
    lowStockCount: Number(low[0]?.count ?? 0),
    topProducts: top.map((t) => ({
      name: t.name,
      sku: t.sku,
      qty: Number(t.qty),
      amount: t.amount,
    })),
  };
}

export async function salesByPaymentMethod(range: ReportRange) {
  const payments = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      status: "COMPLETED",
      createdAt: { gte: range.from, lte: range.to },
    },
    _sum: { amount: true },
    _count: true,
  });
  return payments;
}

export async function salesByUser(range: ReportRange) {
  const sales = await prisma.sale.groupBy({
    by: ["cashierId"],
    where: { status: "COMPLETED", createdAt: { gte: range.from, lte: range.to } },
    _sum: { total: true },
    _count: true,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: sales.map((s) => s.cashierId) } },
  });
  return sales.map((s) => {
    const u = users.find((x) => x.id === s.cashierId);
    return {
      userId: s.cashierId,
      name: u ? `${u.firstName} ${u.lastName}` : "Inconnu",
      total: s._sum.total ?? 0,
      count: s._count,
    };
  });
}
