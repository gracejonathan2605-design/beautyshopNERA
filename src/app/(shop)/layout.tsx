import type { ReactNode } from "react";
import { ShopFooter, ShopHeader } from "@/components/shop/chrome";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ShopHeader />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <ShopFooter />
    </div>
  );
}
