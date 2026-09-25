"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CART_COUNT_COOKIE, readCartCountCookie } from "@/lib/cart-count";

export const NERA_CART_EVENT = "nera-cart";

export function notifyCartCount(count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NERA_CART_EVENT, { detail: count }));
}

function readCount() {
  if (typeof document === "undefined") return 0;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CART_COUNT_COOKIE}=`));
  return readCartCountCookie(match?.split("=")[1]);
}

export function CartLink({ count, compact = false }: { count: number; compact?: boolean }) {
  if (compact) {
    return (
      <Link href="/panier" className="flex min-h-14 flex-col items-center justify-center px-1 text-[11px] text-wine/70">
        <span className={count > 0 ? "font-medium text-brown" : ""}>Panier</span>
        {count > 0 ? <span className="text-[10px] text-brown">{count}</span> : null}
      </Link>
    );
  }
  return (
    <Link href="/panier" className="rounded-full bg-brown px-3 py-2 text-cream sm:px-4">
      Panier{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}

export function ShopCartBadge({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readCount());
    const onCart = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (typeof detail === "number" && Number.isFinite(detail)) {
        setCount(detail);
        return;
      }
      sync();
    };
    sync();
    window.addEventListener(NERA_CART_EVENT, onCart);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("submit", () => window.setTimeout(sync, 400));
    return () => {
      window.removeEventListener(NERA_CART_EVENT, onCart);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <CartLink count={count} compact={compact} />;
}
