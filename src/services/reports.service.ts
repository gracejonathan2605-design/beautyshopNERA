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

const ONLINE_REVENUE_STATUSES = ["CONFIRMED", "PREPARING", "READY", "SHIPPED", "DELIVERED"] as const;

export async function getDashboardMetrics(range: ReportRange) {
  const { from, to } = range;
  const [posAgg, orderAgg, expenses, lowStockRows, posCogsRows, orderCogsRows, top] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: [...ONLINE_REVENUE_STATUSES] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint as count FROM "Inventory" WHERE "onHand" - "reserved" <= "minQuantity"`,
    prisma.$queryRaw<{ cogs: number }[]>`
      SELECT COALESCE(SUM(i.quantity * v."costPrice"), 0)::int as cogs
      FROM "SaleItem" i
      JOIN "Sale" s ON s.id = i."saleId"
      JOIN "ProductVariant" v ON v.id = i."variantId"
      WHERE s.status = 'COMPLETED' AND s."createdAt" BETWEEN ${from} AND ${to}
    `,
    prisma.$queryRaw<{ cogs: number }[]>`
      SELECT COALESCE(SUM(i.quantity * v."costPrice"), 0)::int as cogs
      FROM "OrderItem" i
      JOIN "Order" o ON o.id = i."orderId"
      JOIN "ProductVariant" v ON v.id = i."variantId"
      WHERE o.status IN ('SHIPPED', 'DELIVERED') AND o."createdAt" BETWEEN ${from} AND ${to}
    `,
    prisma.$queryRaw<{ name: string; sku: string; qty: bigint; amount: number }[]>`
      SELECT i."productName" as name, i.sku, SUM(i.quantity)::bigint as qty, SUM(i.total)::int as amount
      FROM "SaleItem" i
      JOIN "Sale" s ON s.id = i."saleId"
      WHERE s.status = 'COMPLETED' AND s."createdAt" BETWEEN ${from} AND ${to}
      GROUP BY i."productName", i.sku
      ORDER BY qty DESC
      LIMIT 8
    `,
  ]);

  const posRevenue = posAgg._sum.total ?? 0;
  const onlineRevenue = orderAgg._sum.total ?? 0;
  const revenue = posRevenue + onlineRevenue;
  const cogs = (posCogsRows[0]?.cogs ?? 0) + (orderCogsRows[0]?.cogs ?? 0);
  const expenseTotal = expenses._sum.amount ?? 0;
  const ticketCount = posAgg._count + orderAgg._count;
  const averageBasket = ticketCount ? Math.round(revenue / ticketCount) : 0;

  return {
    revenue,
    posRevenue,
    onlineRevenue,
    posCount: posAgg._count,
    orderCount: orderAgg._count,
    averageBasket,
    cogs,
    expenseTotal,
    profit: revenue - cogs - expenseTotal,
    lowStockCount: Number(lowStockRows[0]?.count ?? 0),
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
