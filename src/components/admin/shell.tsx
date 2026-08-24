import Link from "next/link";
import { logoutStaff } from "@/app/actions/auth";
import type { StaffSession } from "@/lib/auth";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/pos", label: "Caisse POS" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/stocks", label: "Stocks" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/ventes", label: "Ventes POS" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/depenses", label: "Dépenses" },
  { href: "/admin/rapports", label: "Rapports" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/parametres", label: "Paramètres" },
];

export function AdminShell({ session, children }: { session: StaffSession; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f3ece3]">
      <aside className="no-print hidden w-64 shrink-0 bg-brown p-6 text-cream md:block">
        <p className="font-serif text-3xl">NERA</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">Administration</p>
        <nav className="mt-8 flex flex-col gap-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 hover:bg-white/10">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logoutStaff} className="mt-10">
          <button className="text-sm text-gold">Déconnexion</button>
        </form>
      </aside>
      <div className="flex-1">
        <header className="no-print flex items-center justify-between border-b border-black/10 px-6 py-4">
          <p className="text-sm text-black/60">
            {session.firstName} {session.lastName} · {session.roleName}
          </p>
          <Link href="/" className="text-sm">Voir la boutique</Link>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
