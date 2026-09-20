import { NERA_IDENTITY } from "./nera-identity";
import { slugify } from "./pricing";

export const NAKAE_BEAUTE_SLUG = "nakae-beaute";
export const NAKAE_BEAUTE_NAME = "Nakae Beauté";
export const NAKAE_BEAUTE_INTRO =
  "Découvrez la sélection Nakae Beauté disponible chez NERA Beauté & Shop.";

export const PARTNERSHIP_TYPE_LABELS = {
  UNSET: "Non défini",
  WHOLESALE: "Achat en gros",
  CONSIGNMENT: "Dépôt-vente",
  COMMISSION: "Commission",
  CATALOG: "Catalogue partenaire",
  ON_DEMAND: "Vente à la commande",
} as const;

export const STOCK_OWNER_LABELS = {
  NERA: "Stock NERA",
  PARTNER: "Stock partenaire",
} as const;

export const COLLECTION_KIND_LABELS = {
  ALL: "Tous les produits de la marque",
  NEW: "Nouveautés",
  FEATURED: "Produits vedettes",
  BESTSELLERS: "Best-sellers",
  CATEGORY: "Rayon NERA",
  MANUAL: "Sélection manuelle",
} as const;

export type PartnershipTypeCode = keyof typeof PARTNERSHIP_TYPE_LABELS;
export type StockOwnerCode = keyof typeof STOCK_OWNER_LABELS;
export type CollectionKindCode = keyof typeof COLLECTION_KIND_LABELS;

export function isPartnershipType(value: string): value is PartnershipTypeCode {
  return value in PARTNERSHIP_TYPE_LABELS;
}

export function isStockOwner(value: string): value is StockOwnerCode {
  return value in STOCK_OWNER_LABELS;
}

export function isCollectionKind(value: string): value is CollectionKindCode {
  return value in COLLECTION_KIND_LABELS;
}

export function partnerBrandPath(slug: string) {
  return `/marques/${slug}`;
}

export function uniqueBrandSlug(name: string, explicit?: string | null) {
  const fromExplicit = slugify(String(explicit ?? ""));
  if (fromExplicit) return fromExplicit;
  return slugify(name) || "marque";
}

export function publicPartnerBrand(brand: {
  isPartner: boolean;
  showOnSite: boolean;
  isActive: boolean;
  deletedAt?: Date | string | null;
}) {
  return brand.isPartner && brand.showOnSite && brand.isActive && !brand.deletedAt;
}

export function partnerBrandIntro(brand: { name: string; description?: string | null }) {
  const text = brand.description?.replace(/\s+/g, " ").trim();
  return text || `La sélection ${brand.name} disponible chez ${NERA_IDENTITY.name}.`;
}

export function partnerBrandPageTitle(name: string) {
  return `${name} × ${NERA_IDENTITY.name}`;
}

export function partnerBrandMetaDescription(brand: { name: string; description?: string | null }) {
  return partnerBrandIntro(brand);
}

export function brandJsonLd(input: {
  name: string;
  slug: string;
  description: string;
  logo?: string | null;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: input.name,
    url: input.url,
    description: input.description,
    logo: input.logo || undefined,
    parentOrganization: { "@id": NERA_IDENTITY.organizationId },
  };
}
