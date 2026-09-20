import type { Metadata } from "next";
import { parentCategoryIntro } from "./category-seo";
import { NERA_FAQS, NERA_IDENTITY, NERA_OPENING_HOURS, NERA_PITCH } from "./nera-identity";
import { absoluteUrl, getSiteUrl } from "./site-url";

export function truncateMeta(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function absolutizeMediaUrl(url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return absoluteUrl(url.startsWith("/") ? url : `/${url}`);
}

export function categoryIntro(
  name: string,
  description?: string | null,
  opts?: { slug?: string; parentName?: string | null },
) {
  const fromDb = description?.replace(/\s+/g, " ").trim();
  if (fromDb) return fromDb;
  const parentCopy = opts?.slug ? parentCategoryIntro(opts.slug) : null;
  if (parentCopy) return parentCopy;
  if (opts?.parentName) {
    return `${name} — dans le rayon ${opts.parentName} de NERA Beauté & Shop à Yaoundé. Commandez en ligne ou passez au Marché Neptune Ahala.`;
  }
  return `La sélection ${name} de NERA Beauté & Shop, boutique de beauté à Yaoundé. Commandez en ligne ou passez au Marché Neptune Ahala, face Skymotors.`;
}

export function productPageTitle(name: string, categoryName?: string | null) {
  const clean = name.replace(/\s+/g, " ").trim();
  if (categoryName && clean.length <= 48) return `${clean} · ${categoryName}`;
  return clean;
}

export function productPlainText(description?: string | null, shortDescription?: string | null) {
  return (description || shortDescription || "").replace(/\s+/g, " ").trim();
}

/** Structure le texte existant. N’invente aucune caractéristique. */
export function splitProductCopy(description?: string | null, shortDescription?: string | null) {
  const short = shortDescription?.replace(/\s+/g, " ").trim() || "";
  const long = description?.replace(/\s+/g, " ").trim() || "";
  if (short && long && short !== long) return { lead: short, body: long };
  return { lead: "", body: long || short };
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  index = true,
  follow,
  ogType = "website",
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  index?: boolean;
  /** Pages filtrées / vides : noindex mais follow pour transmettre les fiches produit. */
  follow?: boolean;
  /** `null` : ne pas émettre og:type via l’API Next (ex. product, géré en balise). */
  ogType?: "website" | "article" | null;
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const desc = truncateMeta(description);
  const ogImage = image
    ? [{ url: image, alt: title }]
    : [{ url: "/brand/nera-hero-products.jpg", alt: `${NERA_IDENTITY.name} — boutique beauté à Yaoundé` }];
  const fullTitle = title.includes(NERA_IDENTITY.name) ? title : `${title} | ${NERA_IDENTITY.name}`;
  const allowFollow = follow ?? index;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: {
      canonical: url,
      languages: { "fr-CM": url, "x-default": url },
    },
    robots: { index, follow: allowFollow },
    openGraph: {
      ...(ogType ? { type: ogType } : {}),
      locale: "fr_CM",
      siteName: NERA_IDENTITY.name,
      title: fullTitle,
      description: desc,
      url,
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      images: ogImage.map((row) => row.url),
    },
  };
}

export const noindexMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export function neraOrganizationGraph() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HealthAndBeautyBusiness",
        "@id": NERA_IDENTITY.organizationId,
        name: NERA_IDENTITY.name,
        alternateName: "NERA",
        description: NERA_PITCH,
        slogan: NERA_IDENTITY.slogan,
        url: site,
        email: NERA_IDENTITY.email,
        telephone: NERA_IDENTITY.phoneE164,
        image: absoluteUrl("/brand/nera-logo.jpg"),
        logo: absoluteUrl("/brand/nera-logo.jpg"),
        address: {
          "@type": "PostalAddress",
          streetAddress: NERA_IDENTITY.streetAddress,
          addressLocality: NERA_IDENTITY.addressLocality,
          addressCountry: NERA_IDENTITY.addressCountry,
        },
        areaServed: {
          "@type": "City",
          name: "Yaoundé",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: NERA_IDENTITY.phoneE164,
          contactType: "customer service",
          areaServed: "CM",
          availableLanguage: ["French"],
        },
        currenciesAccepted: "XAF",
        paymentAccepted: "Cash, Orange Money, MTN Mobile Money",
        openingHours: ["Mo-Sa 08:00-19:00", "Su 09:00-15:00"],
        openingHoursSpecification: [...NERA_OPENING_HOURS],
        knowsLanguage: "fr",
        ...(process.env.GOOGLE_BUSINESS_PROFILE_URL?.trim()
          ? { sameAs: [process.env.GOOGLE_BUSINESS_PROFILE_URL.trim()] }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": NERA_IDENTITY.websiteId,
        url: site,
        name: NERA_IDENTITY.name,
        inLanguage: "fr-CM",
        publisher: { "@id": NERA_IDENTITY.organizationId },
      },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** GTIN réel seulement : 8, 12, 13 ou 14 chiffres. N’invente pas de code. */
export function gtinFromBarcode(raw?: string | null) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return undefined;
  return digits;
}

export function merchantReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "CM",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    merchantReturnLink: absoluteUrl("/a-propos"),
  };
}

const yaoundeDestination = {
  "@type": "DefinedRegion",
  addressCountry: "CM",
  addressLocality: "Yaoundé",
} as const;

function deliveryTimeDays(min: number, max: number) {
  return {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: min, maxValue: max, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: min, maxValue: max, unitCode: "DAY" },
  };
}

/** Retrait 0 F (vrai) + zones de livraison enregistrées. N’invente pas de tarif. */
export function merchantShippingDetails(zones: { name: string; fee: number }[] = []) {
  const pickup = {
    "@type": "OfferShippingDetails",
    shippingLabel: "Retrait en boutique",
    shippingDestination: yaoundeDestination,
    shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "XAF" },
    deliveryTime: deliveryTimeDays(0, 0),
  };
  const deliveries = zones.map((zone) => ({
    "@type": "OfferShippingDetails",
    shippingLabel: zone.name,
    shippingDestination: yaoundeDestination,
    shippingRate: { "@type": "MonetaryAmount", value: String(zone.fee), currency: "XAF" },
    deliveryTime: deliveryTimeDays(0, 1),
  }));
  return [pickup, ...deliveries];
}

export function productJsonLd(input: {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  brand?: string | null;
  category?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  inStock: boolean;
  shippingZones?: { name: string; fee: number }[];
}) {
  const url = absoluteUrl(input.path);
  const image = absolutizeMediaUrl(input.image);
  const sku = input.sku?.trim() || undefined;
  const gtin = gtinFromBarcode(input.barcode);
  const offer =
    input.price != null && input.price > 0
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "XAF",
          price: String(input.price),
          itemCondition: "https://schema.org/NewCondition",
          availability: input.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: { "@id": NERA_IDENTITY.organizationId },
          hasMerchantReturnPolicy: merchantReturnPolicy(),
          shippingDetails: merchantShippingDetails(input.shippingZones),
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description || input.name,
    url,
    image: image ? [image] : undefined,
    "@id": `${url}#product`,
    sku,
    gtin,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    category: input.category || undefined,
    offers: offer,
  };
}

export function collectionJsonLd(input: {
  path: string;
  name: string;
  description: string;
  items: { name: string; path: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: absoluteUrl(input.path),
    name: input.name,
    description: input.description,
    inLanguage: "fr-CM",
    isPartOf: { "@id": NERA_IDENTITY.websiteId },
    about: { "@id": NERA_IDENTITY.organizationId },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.slice(0, 24).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: NERA_FAQS.map((row) => ({
      "@type": "Question",
      name: row.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: row.answer,
      },
    })),
  };
}

export function webPageJsonLd(input: { path: string; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${absoluteUrl(input.path)}#webpage`,
    url: absoluteUrl(input.path),
    name: input.name,
    description: input.description,
    isPartOf: { "@id": NERA_IDENTITY.websiteId },
    about: { "@id": NERA_IDENTITY.organizationId },
    inLanguage: "fr-CM",
  };
}
