import { ShopFooter, ShopHeader } from "@/components/shop/chrome";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ShopHeader />
      <div className="flex-1">{children}</div>
      <ShopFooter />
    </div>
  );
}
