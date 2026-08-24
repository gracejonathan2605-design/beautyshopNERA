import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { formatCfa } from "@/lib/money";

export default async function SalesAdminPage() {
  await requireStaff("sales.view");
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: { cashier: true, payments: true },
    take: 100,
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Ventes POS</h1>
      <ul className="mt-6 space-y-2">
        {sales.map((s) => (
          <li key={s.id} className="flex justify-between rounded-2xl bg-cream p-4">
            <span>{s.number} · {s.cashier.firstName} · {s.status}</span>
            <span>{formatCfa(s.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
