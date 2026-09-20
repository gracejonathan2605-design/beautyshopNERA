import Link from "next/link";
import Image from "next/image";
import { partnerBrandPath } from "@/lib/partner-brands";

export function PartnerBrandMark({
  name,
  logo,
  size = "md",
}: {
  name: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-24 w-24" : size === "sm" ? "h-12 w-12" : "h-16 w-16";
  if (logo) {
    return (
      <span className={`relative inline-block overflow-hidden rounded-full border border-[#eee0e6] bg-white ${box}`}>
        <Image src={logo} alt="" fill className="object-contain p-1" sizes="96px" />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border border-gold/40 bg-blush/50 font-serif text-wine ${box} ${size === "lg" ? "text-3xl" : "text-lg"}`}
      aria-hidden
    >
      {initials || "N"}
    </span>
  );
}

export function PartnerBrandsSection({
  brands,
}: {
  brands: { name: string; slug: string; logo?: string | null; description?: string | null }[];
}) {
  if (!brands.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Chez NERA</p>
          <h2 className="mt-2 font-serif text-4xl text-wine">Nos marques partenaires</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55">
            Des marques disponibles à NERA Beauté & Shop, en magasin et en ligne — même panier, même commande.
          </p>
        </div>
        <Link href="/marques" className="text-sm text-brown underline">
          Toutes les marques
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={partnerBrandPath(brand.slug)}
            className="group rounded-[1.6rem] border border-[#eee0e6] bg-white/85 p-6 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg"
          >
            <PartnerBrandMark name={brand.name} logo={brand.logo} />
            <p className="mt-4 font-serif text-2xl text-wine group-hover:text-brown">{brand.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/35">× NERA Beauté & Shop</p>
            {brand.description ? (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-black/55">{brand.description}</p>
            ) : null}
            <p className="mt-4 text-sm text-brown">Découvrir</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
