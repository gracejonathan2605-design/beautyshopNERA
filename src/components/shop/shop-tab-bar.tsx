"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShopCartBadge } from "@/components/shop/cart-badge";
import { NERA_IDENTITY } from "@/lib/nera-identity";

const TABS = [
  { href: "/", label: "Accueil" },
  { href: "/boutique", label: "Boutique" },
  { href: "/compte", label: "Compte" },
] as const;

export function ShopTabBar() {
  const path = usePathname() || "/";
  const phone = NERA_IDENTITY.phoneE164.replace(/\D/g, "");
  const wa = `https://wa.me/${phone}?text=${encodeURIComponent("Bonjour NERA Beauté, j’aimerais un conseil.")}`;
  return (
    <nav
      aria-label="Navigation mobile"
      className="shop-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-[#eee0e6] bg-white/95 md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex min-h-14 items-center justify-center px-1 text-center text-[11px] ${active ? "font-medium text-brown" : "text-wine/70"}`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li className="flex min-h-14 items-center justify-center">
          <ShopCartBadge compact />
        </li>
        <li>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center justify-center text-[11px] text-wine/70"
          >
            WhatsApp
          </a>
        </li>
      </ul>
    </nav>
  );
}
