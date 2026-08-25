import Link from "next/link";
import { logoutStaff } from "@/app/actions/auth";
import { getStaffSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function StaffToolbar() {
  const session = await getStaffSession().catch(() => null);
  if (!session) return null;

  return (
    <div className="no-print border-b border-[#eee0e6] bg-blush/80 text-wine">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
        <p>
          Connectée · {session.firstName} {session.lastName}
          <span className="opacity-70"> · {session.roleName}</span>
        </p>
        <div className="flex items-center gap-4">
          {hasPermission(session, "pos.access") ? (
            <Link href="/pos" prefetch={false} className="underline-offset-2 hover:underline">
              Caisse
            </Link>
          ) : null}
          {hasPermission(session, "dashboard.view") ? (
            <Link href="/admin" className="underline-offset-2 hover:underline">
              Administration
            </Link>
          ) : null}
          <form action={logoutStaff}>
            <button type="submit" className="text-brown">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
