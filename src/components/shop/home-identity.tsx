import Link from "next/link";
import { NERA_IDENTITY } from "@/lib/nera-identity";

export function HomeIdentity({ categories }: { categories: { name: string; slug: string }[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="nera-identite">
      <div className="rounded-[2.2rem] border border-[#eee0e6] bg-white/85 px-6 py-12 md:px-14 md:py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">La maison</p>
        <h2 id="nera-identite" className="mt-3 font-serif text-4xl text-wine md:text-5xl">
          Qui est NERA Beauté & Shop ?
        </h2>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-black/60">
          NERA Beauté & Shop est une boutique de beauté à Yaoundé. Nous vendons en magasin et en ligne une
          sélection de cosmétiques, soins, produits capillaires, mèches, perruques, maquillage, parfums et
          accessoires — pour celles et ceux qui veulent se sentir bien, avec un conseil réel plutôt qu’un
          catalogue froid.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-serif text-2xl text-wine">Où se trouve NERA ?</h3>
            <p className="mt-3 text-black/60">
              {NERA_IDENTITY.addressLine}. Vous pouvez passer en boutique ou commander depuis le site.
            </p>
            <p className="mt-2 text-black/60">
              Téléphone :{" "}
              <a className="text-brown underline" href={`tel:${NERA_IDENTITY.phoneE164}`}>
                {NERA_IDENTITY.phoneDisplay}
              </a>
            </p>
          </div>
          <div>
            <h3 className="font-serif text-2xl text-wine">Pour qui, et quels services ?</h3>
            <p className="mt-3 text-black/60">
              Pour les clientes de Yaoundé et alentours qui cherchent des produits de beauté et de soins.
              En magasin comme en ligne : conseil, retrait, et livraison disponible.
            </p>
          </div>
        </div>

        {categories.length ? (
          <div className="mt-10">
            <h3 className="font-serif text-2xl text-wine">Que vend NERA ?</h3>
            <p className="mt-3 max-w-3xl text-black/60">
              Les rayons actuellement proposés en boutique :
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categorie/${category.slug}`}
                    className="inline-block rounded-full border border-[#eee0e6] bg-blush/40 px-3 py-1.5 text-sm text-wine hover:border-gold"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-10 text-sm text-black/50">
          En savoir plus sur{" "}
          <Link href="/a-propos" className="text-brown underline">
            NERA Beauté & Shop
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
