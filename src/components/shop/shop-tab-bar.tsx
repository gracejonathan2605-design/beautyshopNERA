"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShopCartBadge } from "@/components/shop/cart-badge";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { isShopTabActive } from "@/lib/shop-nav";

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
      className="shop-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 bg-cream/95 md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = isShopTabActive(tab.href, path);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
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
