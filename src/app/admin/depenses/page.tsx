import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { saveExpense } from "@/app/actions/admin";
import { formatCfa } from "@/lib/money";

export default async function ExpensesAdminPage() {
  await requireStaff("expenses.view");
  const [categories, expenses] = await Promise.all([
    prisma.expenseCategory.findMany({ where: { isActive: true } }),
    prisma.expense.findMany({ include: { category: true }, orderBy: { date: "desc" }, take: 100 }),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">Dépenses</h1>
      <form action={saveExpense} className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-4">
        <select name="categoryId" required className="rounded-xl border px-3 py-2">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input name="amount" type="number" required placeholder="Montant" className="rounded-xl border px-3 py-2" />
        <input name="date" type="date" required className="rounded-xl border px-3 py-2" />
        <input name="description" placeholder="Libellé" className="rounded-xl border px-3 py-2" />
        <button className="rounded-full bg-brown py-2 text-cream">Enregistrer</button>
      </form>
      <ul className="mt-6 space-y-2">
        {expenses.map((e) => (
          <li key={e.id} className="flex justify-between rounded-xl bg-cream p-4">
            <span>{e.category.name} · {e.description}</span>
            <span>{formatCfa(e.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
