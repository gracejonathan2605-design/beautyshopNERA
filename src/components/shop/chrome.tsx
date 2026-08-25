import Link from "next/link";
import { getShopSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { getCart } from "@/lib/cart";
import { getNavCategories } from "@/lib/catalog-cache";
import { StaffToolbar } from "@/components/staff/toolbar";
import { whatsappChatUrl } from "@/lib/receipt";
import { BrandLockup, BrandLogo } from "@/components/brand/logo";
import { PayDeliveryBadges, ShopLegalBlock } from "@/components/shop/trust-badges";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
      <path
        fill="currentColor"
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.14-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37A9.86 9.86 0 0 1 2.16 11.9C2.16 6.44 6.6 2.01 12.05 2.01a9.82 9.82 0 0 1 6.99 2.9 9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L0 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41z"
      />
    </svg>
  );
}

export async function ShopHeader() {
  let settings = (await getShopSettings().catch(() => null)) ?? {
    name: "NERA Beauté & Shop",
    phone: "",
  };
  let cart: Awaited<ReturnType<typeof getCart>> = [];
  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    [cart, categories] = await Promise.all([getCart(), getNavCategories()]);
  } catch {
    cart = [];
    categories = [];
  }
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="relative z-20 overflow-x-hidden border-b border-[#eee0e6] bg-white/90">
      <StaffToolbar />
      <p className="bg-champagne/80 py-1.5 text-center text-[11px] uppercase tracking-[0.18em] text-wine">
        Yaoundé · OM & MoMo · Livraison rapide sous 24h
      </p>
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-w-0 shrink" aria-label={settings.name}>
          <BrandLockup size="sm" priority />
        </Link>
        <form action="/boutique" className="hidden min-w-0 flex-1 md:block">
          <input
            name="q"
            placeholder="Rechercher un produit, une mèche, un parfum…"
            className="w-full rounded-full border border-[#eee0e6] bg-[#fffcfb] px-5 py-2.5 text-sm"
          />
        </form>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link href="/boutique" className="hidden text-wine/80 hover:text-wine sm:inline">
            Boutique
          </Link>
          <Link href="/compte" className="hidden text-wine/80 hover:text-wine sm:inline">
            Compte
          </Link>
          <Link href="/panier" className="rounded-full bg-brown px-4 py-2 text-cream">
            Panier ({count})
          </Link>
        </div>
      </div>
      <form action="/boutique" className="px-4 pb-3 md:hidden">
        <input
          name="q"
          placeholder="Rechercher…"
          className="w-full rounded-full border border-[#eee0e6] bg-[#fffcfb] px-4 py-2.5 text-sm"
        />
      </form>
      {categories.length ? (
        <nav className="mx-auto flex max-w-6xl flex-wrap justify-center gap-1.5 px-4 pb-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categorie/${c.slug}`}
              className="max-w-full rounded-full border border-[#eee0e6] bg-white px-2.5 py-1 text-center text-[11px] leading-snug text-wine hover:border-gold hover:bg-blush sm:px-3 sm:text-xs"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export async function ShopFooter() {
  const settings = (await getShopSettings().catch(() => null)) ?? DEFAULT_SETTINGS;
  const wa = settings.phone ? whatsappChatUrl(settings.phone, "Bonjour NERA Beauté, j’aimerais un conseil.") : "";
  return (
    <>
      <footer className="mt-20 border-t border-[#eee0e6] bg-white/75">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
          <div>
            <BrandLogo size="lg" />
            <p className="mt-4 font-serif text-3xl tracking-[0.12em] text-wine">{settings.name}</p>
            <div className="gold-rule mt-4 max-w-40" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-black/55">{settings.slogan}</p>
            <div className="mt-5">
              <PayDeliveryBadges />
            </div>
          </div>
          <div className="text-sm leading-7 text-black/60">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Boutique</p>
            <p className="mt-2">{settings.address}</p>
            <p>
              {settings.city}, {settings.country}
            </p>
            <p>{settings.phone}</p>
            <p>{settings.email}</p>
            {settings.mtnPhone ? <p>MoMo / MTN : {settings.mtnPhone}</p> : null}
            {wa ? (
              <a href={wa} className="mt-2 inline-block text-brown underline" target="_blank" rel="noreferrer">
                Écrire sur WhatsApp
              </a>
            ) : null}
          </div>
          <div className="text-sm leading-7 text-black/55">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Service</p>
            <p className="mt-2">Retrait en boutique</p>
            <p>Livraison rapide sous 24h à Yaoundé</p>
            <p>Paiement OM, MoMo et espèces</p>
            <ShopLegalBlock
              className="mt-4"
              rccm={settings.rccm}
              nui={settings.nui}
              email={settings.email}
              mtnPhone={settings.mtnPhone}
            />
            {settings.terms ? <p className="mt-4 text-xs opacity-80">{settings.terms}</p> : null}
          </div>
        </div>
      </footer>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="wa-fab no-print flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg"
          aria-label="WhatsApp NERA"
        >
          <WhatsAppIcon />
        </a>
      ) : null}
    </>
  );
}
