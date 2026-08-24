import Link from "next/link";
import { logoutStaff } from "@/app/actions/auth";
import type { StaffSession } from "@/lib/auth";
import { hasPermission, type PermissionCode } from "@/lib/permissions";

const LINKS: { href: string; label: string; permission: PermissionCode }[] = [
  { href: "/admin", label: "Tableau de bord", permission: "dashboard.view" },
  { href: "/pos", label: "Caisse POS", permission: "pos.access" },
  { href: "/admin/produits", label: "Produits", permission: "products.view" },
  { href: "/admin/categories", label: "Catégories", permission: "categories.view" },
  { href: "/admin/stocks", label: "Stocks", permission: "stock.view" },
  { href: "/admin/commandes", label: "Commandes", permission: "orders.view" },
  { href: "/admin/ventes", label: "Ventes POS", permission: "sales.view" },
  { href: "/admin/clients", label: "Clients", permission: "customers.view" },
  { href: "/admin/depenses", label: "Dépenses", permission: "expenses.view" },
  { href: "/admin/rapports", label: "Rapports", permission: "reports.view" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", permission: "users.view" },
  { href: "/admin/parametres", label: "Paramètres", permission: "settings.view" },
];

export function AdminShell({ session, children }: { session: StaffSession; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print hidden w-64 shrink-0 border-r border-[#eee0e6] bg-white/90 p-6 text-wine md:block">
        <p className="font-serif text-3xl tracking-[0.16em]">NERA</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">Administration</p>
        <div className="gold-rule mt-5" />
        <nav className="mt-6 flex flex-col gap-1 text-sm">
          {LINKS.filter((l) => hasPermission(session, l.permission)).map((l) => (
            <Link key={l.href} href={l.href} className="rounded-xl px-3 py-2 hover:bg-blush">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logoutStaff} className="mt-10">
          <button className="text-sm text-brown">Déconnexion</button>
        </form>
      </aside>
      <div className="flex-1">
        <header className="no-print flex items-center justify-between border-b border-[#eee0e6] bg-white/80 px-6 py-4 backdrop-blur">
          <p className="text-sm text-black/60">
            {session.firstName} {session.lastName} · {session.roleName}
          </p>
          <Link href="/" className="text-sm text-brown">
            Voir la boutique
          </Link>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
