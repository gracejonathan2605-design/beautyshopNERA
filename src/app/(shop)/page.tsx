import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/settings";
import { ProductCard } from "@/components/shop/product-card";
import { productCardInclude } from "@/lib/product-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TRUST = [
  { title: "Sélection premium", text: "Soins, mèches, parfums et mode choisis pour durer." },
  { title: "Paiement simple", text: "Espèces, Mobile Money ou carte en boutique." },
  { title: "Yaoundé", text: "Retrait au magasin ou livraison dans la ville." },
  { title: "Conseil NERA", text: "Une équipe pour vous accompagner, pas un catalogue froid." },
];

export default async function HomePage() {
  let settings;
  try {
    settings = await getShopSettings();
  } catch {
    return (
      <section className="hero-light px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.32em] text-gold">Yaoundé · Cameroun</p>
          <h1 className="mt-4 font-serif text-6xl text-wine">NERA Beauté & Shop</h1>
          <p className="mt-4 max-w-xl text-lg text-black/65">
            La boutique est en ligne, mais la base n’est pas encore reliée à Vercel. Ajoutez
            DATABASE_URL et DIRECT_URL (pooler session Supabase) dans Project → Settings → Environment Variables, puis redéployez.
          </p>
        </div>
      </section>
    );
  }
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
      <section className="hero-light px-4 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.35em] text-gold">Maison de beauté · Yaoundé</p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-wine md:text-7xl">
            {settings.name}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/60">{settings.slogan}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/boutique" className="rounded-full bg-brown px-8 py-3 text-cream">
              Entrer dans la boutique
            </Link>
            <Link href="/compte" className="rounded-full border border-[#eee0e6] bg-white/85 px-8 py-3 text-wine">
              Mon compte
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((item) => (
          <div key={item.title} className="rounded-3xl border border-[#eee0e6] bg-white/80 p-5">
            <p className="font-serif text-xl text-wine">{item.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-black/55">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Rayons</p>
            <h2 className="mt-2 font-serif text-4xl text-wine">Univers NERA</h2>
          </div>
          <Link href="/boutique" className="text-sm text-brown underline">
            Tout voir
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categorie/${c.slug}`}
              className="group rounded-[1.6rem] border border-[#eee0e6] bg-white/85 p-6 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg"
            >
              <p className="font-serif text-2xl text-wine group-hover:text-brown">{c.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-black/35">Découvrir</p>
            </Link>
          ))}
        </div>
      </section>

      {[
        ["Sélection NERA", featured],
        ["Nouveautés", news],
        ["Promotions", promos],
      ].map(([title, items]) =>
        (items as typeof featured).length ? (
          <section key={title as string} className="mx-auto max-w-6xl px-4 py-8">
            <h2 className="font-serif text-4xl text-wine">{title as string}</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              {(items as typeof featured).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="overflow-hidden rounded-[2.2rem] border border-[#eee0e6] bg-linear-to-br from-white via-blush to-champagne px-8 py-14 text-center md:px-16">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">La maison</p>
          <h2 className="mt-3 font-serif text-4xl text-wine md:text-5xl">Une boutique où l’on aime rester</h2>
          <p className="mx-auto mt-4 max-w-xl text-black/55">
            Lumière claire, conseils chaleureux, produits que vous pouvez toucher. NERA, c’est la grande boutique beauté de
            Yaoundé — en ligne comme en magasin.
          </p>
          <Link href="/boutique" className="mt-8 inline-block rounded-full bg-brown px-8 py-3 text-cream">
            Voir les produits
          </Link>
        </div>
      </section>
    </div>
  );
}
