import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { formatCfa } from "@/lib/money";

export default async function CustomersAdminPage() {
  await requireStaff("customers.view");
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Clients</h1>
      <ul className="mt-6 space-y-2">
        {customers.map((c) => (
          <li key={c.id} className="rounded-2xl bg-cream p-4">
            {c.code} · {c.firstName} {c.lastName} · {c.phone ?? c.email} · {formatCfa(c.totalSpent)}
          </li>
        ))}
      </ul>
    </div>
  );
}
