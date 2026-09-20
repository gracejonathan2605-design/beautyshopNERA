import { Suspense, type ReactNode } from "react";
import { ShopFooter, ShopHeader, ShopHeaderFallback } from "@/components/shop/chrome";

export const runtime = "nodejs";
export const revalidate = 60;

export default function ShopLayout({ children }: { children: ReactNode }) {

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-block focus:rounded-full focus:bg-brown focus:px-4 focus:py-2 focus:text-cream"
      >
        Aller au contenu
      </a>
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
