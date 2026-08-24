import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/settings";
import { ProductCard } from "@/components/shop/product-card";
import { productCardInclude } from "@/lib/product-query";

export default async function HomePage() {
  const settings = await getShopSettings();
  const [featured, news, promos, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", onlineVisible: true, isFeatured: true, deletedAt: null },
      include: productCardInclude,
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", onlineVisible: true, isNew: true, deletedAt: null },
      include: productCardInclude,
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", onlineVisible: true, isPromo: true, deletedAt: null },
      include: productCardInclude,
      take: 8,
    }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div>
      <section className="bg-linear-to-r from-[#5c4033] to-[#c4a574] px-4 py-24 text-cream">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.3em]">Yaoundé · Cameroun</p>
          <h1 className="mt-4 font-serif text-6xl">{settings.name}</h1>
          <p className="mt-4 max-w-xl text-lg opacity-90">{settings.slogan}</p>
          <Link href="/boutique" className="mt-8 inline-block rounded-full bg-cream px-6 py-3 text-brown">
            Entrer dans la boutique
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-serif text-4xl">Univers</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/categorie/${c.slug}`} className="rounded-2xl bg-cream p-6 shadow-sm">
              {c.name}
            </Link>
          ))}
        </div>
      </section>
      {[
        ["Sélection NERA", featured],
        ["Nouveautés", news],
        ["Promotions", promos],
      ].map(([title, items]) => (
        <section key={title as string} className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-serif text-4xl">{title as string}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {(items as typeof featured).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
