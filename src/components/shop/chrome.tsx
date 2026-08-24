import Link from "next/link";
import { getShopSettings } from "@/lib/settings";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";

export async function ShopHeader() {
  const [settings, cart, categories] = await Promise.all([
    getShopSettings(),
    getCart(),
    prisma.category.findMany({
      where: { isActive: true, parentId: null, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
  ]);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="border-b border-black/10 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-serif text-3xl tracking-wide text-brown">
          {settings.name}
        </Link>
        <nav className="hidden gap-6 text-sm md:flex">
          <Link href="/boutique">Boutique</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/categorie/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/compte">Compte</Link>
          <Link href="/panier" className="rounded-full bg-brown px-4 py-2 text-cream">
            Panier ({count})
          </Link>
        </div>
      </div>
    </header>
  );
}

export async function ShopFooter() {
  const settings = await getShopSettings();
  return (
    <footer className="mt-16 border-t border-black/10 bg-brown text-cream">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl">{settings.name}</p>
          <p className="mt-2 text-sm opacity-80">{settings.slogan}</p>
        </div>
        <div className="text-sm opacity-80">
          <p>{settings.address}</p>
          <p>{settings.city}, {settings.country}</p>
          <p>{settings.phone}</p>
        </div>
        <p className="text-sm opacity-70">{settings.terms}</p>
      </div>
    </footer>
  );
}
