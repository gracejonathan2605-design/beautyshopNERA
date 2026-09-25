import Link from "next/link";
import { HeroProducts } from "@/components/brand/logo";
import { NERA_IDENTITY, NERA_PITCH } from "@/lib/nera-identity";
import { YAOUNDE_PLACES } from "@/lib/shop-faces";

export function HomeIdentity() {
  return (
    <section className="mt-8 bg-champagne" aria-labelledby="nera-identite">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
        <HeroProducts priority={false} className="aspect-[4/5] md:aspect-[4/5]" />
        <div>
          <div className="gold-rule max-w-24" />
          <h2 id="nera-identite" className="mt-4 font-serif text-4xl text-wine md:text-5xl">
            La maison, au marché Neptune
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-black/65">{NERA_PITCH}</p>
          <p className="mt-4 text-black/65">
            Conseil en magasin et sur WhatsApp. Passez au {NERA_IDENTITY.streetAddress}, ou faites-vous livrer.
          </p>
          <ul className="mt-6 space-y-3">
            {YAOUNDE_PLACES.map((item) => (
              <li key={item.place}>
                <p className="font-medium text-wine">{item.place}</p>
                <p className="text-sm text-black/60">{item.line}</p>
              </li>
            ))}
          </ul>
          <Link href="/a-propos" className="mt-6 inline-block text-sm text-wine underline decoration-wine/30 underline-offset-4">
            À propos
          </Link>
        </div>
      </div>
    </section>
  );
}
