import { requireStaff } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

function formatWhen(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarize(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default async function AuditPage() {
  await requireStaff("audit.view");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return (
    <div>
      <h1 className="font-serif text-4xl">Journal d’audit</h1>
      <p className="mt-2 text-sm text-black/55">Qui a créé, modifié ou encaissé quoi.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-cream">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50">
              <th className="p-3">Quand</th>
              <th>Qui</th>
              <th>Action</th>
              <th>Cible</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-black/5">
                <td className="p-3 whitespace-nowrap">{formatWhen(log.createdAt)}</td>
                <td>
                  {log.user ? `${log.user.firstName} ${log.user.lastName}` : "Système"}
                </td>
                <td>{log.action}</td>
                <td>
                  {log.entity}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="max-w-xs truncate text-black/50">{summarize(log.after ?? log.before)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!logs.length ? <p className="mt-6 text-sm text-black/50">Aucun événement pour le moment.</p> : null}
    </div>
  );
}
