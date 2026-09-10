import { Suspense, type ReactNode } from "react";
import { ShopFooter, ShopHeader, ShopHeaderFallback } from "@/components/shop/chrome";

export const runtime = "nodejs";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<ShopHeaderFallback />}>
        <ShopHeader />
      </Suspense>
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Suspense fallback={null}>
        <ShopFooter />
      </Suspense>
    </div>
  );
}
