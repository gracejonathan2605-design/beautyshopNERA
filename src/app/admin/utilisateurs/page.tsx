import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";

export default async function UsersAdminPage() {
  await requireStaff("users.view");
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { role: true },
    orderBy: { lastName: "asc" },
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Utilisateurs</h1>
      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl bg-cream p-4">
            {u.firstName} {u.lastName} · {u.email} · {u.role.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
