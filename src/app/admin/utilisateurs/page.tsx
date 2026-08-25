import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { hasPermission } from "@/lib/permissions";
import { createStaffUser, updateStaffUser } from "@/app/actions/ops";
import { AdminFlash } from "@/components/admin/flash";

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const session = await requireStaff("users.view");
  const { ok, erreur } = await searchParams;
  const canCreate = hasPermission(session, "users.create");
  const canUpdate = hasPermission(session, "users.update");
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      include: { role: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.role.findMany({
      where: session.isSuperAdmin ? undefined : { isSuperAdmin: false },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">Utilisateurs</h1>
      <AdminFlash ok={ok} erreur={erreur} />
      {canCreate ? (
        <form action={createStaffUser} className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-2">
          <h2 className="font-serif text-2xl md:col-span-2">Créer un compte équipe</h2>
          <input name="firstName" required placeholder="Prénom" className="rounded-xl border px-3 py-2" />
          <input name="lastName" required placeholder="Nom" className="rounded-xl border px-3 py-2" />
          <input name="email" type="email" required placeholder="Email" className="rounded-xl border px-3 py-2" />
          <input name="phone" placeholder="Téléphone" className="rounded-xl border px-3 py-2" />
          <input name="password" type="password" required minLength={8} placeholder="Mot de passe (8+)" className="rounded-xl border px-3 py-2" />
          <select name="roleId" required className="rounded-xl border px-3 py-2">
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-brown py-2 text-cream md:col-span-2">Créer</button>
        </form>
      ) : null}
      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl bg-cream p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {u.firstName} {u.lastName}
                </p>
                <p className="text-sm text-black/50">
                  {u.email} · {u.isActive ? "Actif" : "Désactivé"}
                </p>
              </div>
              {canUpdate ? (
                <form action={updateStaffUser} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="roleId" defaultValue={u.roleId} className="rounded-xl border px-3 py-2 text-sm">
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <select name="isActive" defaultValue={u.isActive ? "1" : "0"} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="1">Actif</option>
                    <option value="0">Désactivé</option>
                  </select>
                  <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">OK</button>
                </form>
              ) : (
                <span className="text-sm text-black/50">{u.role.name}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
