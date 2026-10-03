import Link from "next/link";
import type { LegalSection } from "@/lib/shop-legal";

const RELATED = [
  { href: "/cgv", label: "Conditions de vente" },
  { href: "/retours", label: "Conditions de retour" },
  { href: "/confidentialite", label: "Confidentialité" },
] as const;

export function LegalDocument({
  kicker,
  title,
  description,
  updated,
  sections,
  current,
}: {
  kicker: string;
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
  current: (typeof RELATED)[number]["href"];
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">{kicker}</p>
      <h1 className="mt-3 font-serif text-5xl text-wine">{title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-black/60">{description}</p>
      <p className="mt-2 text-xs text-black/40">Mise à jour : {updated}</p>
      <nav aria-label="Sommaire" className="mt-8 rounded-2xl border border-[#eee0e6] bg-white p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Sommaire</p>
        <ol className="mt-3 space-y-1.5 text-sm">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-wine underline-offset-2 hover:underline">
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-10 space-y-8">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="font-serif text-2xl text-wine">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-black/70">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${section.id}-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm leading-relaxed text-black/55">
        Voir aussi{" "}
        {RELATED.filter((item) => item.href !== current).map((item, index, list) => (
          <span key={item.href}>
            <Link href={item.href} className="text-wine underline decoration-wine/30 underline-offset-2">
              {item.label}
            </Link>
            {index < list.length - 1 ? " · " : "."}
          </span>
        ))}
      </p>
    </article>
  );
}
