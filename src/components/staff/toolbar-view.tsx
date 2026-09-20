"use client";

import Link from "next/link";
import { logoutStaff } from "@/app/actions/auth";

export type StaffToolbarData = {
  firstName: string;
  lastName: string;
  roleName: string;
  pos: boolean;
  admin: boolean;
};

export function StaffToolbarView({ firstName, lastName, roleName, pos, admin }: StaffToolbarData) {
  return (
    <div className="no-print border-b border-[#eee0e6] bg-blush/80 text-wine">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
        <p>
          Connectée · {firstName} {lastName}
          <span className="opacity-70"> · {roleName}</span>
        </p>
        <div className="flex items-center gap-4">
          {pos ? (
            <Link href="/pos" prefetch={false} className="underline-offset-2 hover:underline">
              Caisse
            </Link>
          ) : null}
          {admin ? (
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
