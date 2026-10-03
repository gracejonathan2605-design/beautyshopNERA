import type { ReactNode } from "react";
import Link from "next/link";
import { HeroProducts } from "@/components/brand/logo";
import { ShopBreadcrumbs } from "@/components/shop/breadcrumbs";
import { RegistreTrustLink } from "@/components/shop/registre-commerce";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { MECHES_HREF, SHOP_HERO_LINE, SHOP_TRUST_LINE } from "@/lib/shop-faces";

export function MaisonRibbon() {
  return (
    <ul className="grid border-b border-gold/30 bg-wine text-cream sm:grid-cols-2 lg:grid-cols-4">
      <li className="border-gold/25 px-5 py-5 lg:border-r">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold">En magasin</p>
        <p className="mt-2 text-sm">{NERA_IDENTITY.streetAddress}</p>
      </li>
      <li className="border-gold/25 px-5 py-5 lg:border-r">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Ouvert</p>
        <p className="mt-2 text-sm">{NERA_IDENTITY.hoursWeekdays}</p>
      </li>
      <li className="border-gold/25 px-5 py-5 lg:border-r">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Paiement</p>
        <p className="mt-2 text-sm">Orange Money sans frais · MoMo</p>
      </li>
      <li className="px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Entreprise</p>
        <div className="mt-2">
          <RegistreTrustLink />
        </div>
      </li>
    </ul>
  );
}

export function MaisonPageHead({
  kicker,
  title,
  lede,
  crumbs,
  actions,
  align = "start",
  compact = false,
}: {
  kicker?: string;
  title?: string;
  lede?: ReactNode;
  crumbs?: { name: string; href?: string }[];
  actions?: ReactNode;
  align?: "start" | "center";
  compact?: boolean;
}) {
  const centered = align === "center";
  const pad = compact && !title ? "py-6 md:py-8" : "py-12 md:py-16";
  return (
    <header>
      <div className="bg-wine text-cream">
        <div className={`mx-auto max-w-6xl px-5 md:px-12 ${pad} ${centered ? "text-center" : ""}`}>
          {crumbs ? <ShopBreadcrumbs tone="cream" items={crumbs} /> : null}
          {kicker ? (
            <p className={`${crumbs ? "mt-5" : ""} text-[10px] uppercase tracking-[0.42em] text-champagne`}>{kicker}</p>
          ) : null}
          {title ? (
            <div
              className={
                actions && !centered
                  ? "mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
                  : "mt-4"
              }
            >
              <h1 className={`max-w-4xl font-serif text-5xl leading-[0.92] text-cream md:text-7xl${centered ? " mx-auto" : ""}`}>
                {title}
              </h1>
              {actions}
            </div>
          ) : null}
          {lede ? (
            <p className={`mt-5 max-w-2xl text-sm leading-relaxed text-cream/80 md:text-base ${centered ? "mx-auto" : ""}`}>
              {lede}
            </p>
          ) : null}
        </div>
      </div>
      <MaisonRibbon />
    </header>
  );
}

export function MaisonHero({ notice }: { notice?: string }) {
  return (
    <section>
      <div className="relative min-h-[82svh] bg-wine">
        <HeroProducts bleed />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-wine via-wine/55 to-wine/15 md:bg-linear-to-r md:from-wine md:via-wine/70 md:to-transparent" />
        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="w-full max-w-6xl px-5 pb-10 md:px-12 md:pb-0">
            <p className="text-[10px] uppercase tracking-[0.42em] text-champagne">Nera · Maison de beauté</p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.9] text-cream sm:text-6xl md:text-8xl">
              {SHOP_HERO_LINE}
            </h1>
            <p className="mt-5 max-w-md text-sm tracking-wide text-cream/80 md:text-base">{SHOP_TRUST_LINE}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={MECHES_HREF} className="rounded-full bg-brown px-8 py-3.5 text-center text-sm text-cream">
                Voir les mèches
              </Link>
              <Link
                href="/boutique"
                className="rounded-full border border-cream/80 bg-cream px-8 py-3.5 text-center text-sm text-wine"
              >
                Entrer dans la boutique
              </Link>
            </div>
          </div>
        </div>
      </div>
      <MaisonRibbon />
      {notice ? <p className="mx-auto max-w-xl px-5 py-6 text-sm text-black/65">{notice}</p> : null}
    </section>
  );
}
