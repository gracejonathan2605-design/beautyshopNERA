import { cache } from "react";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { normalizeFlashDurationDays } from "./flash";
import { NERA_IDENTITY } from "./nera-identity";
import { DEFAULT_PENDING_ORDER_HOURS, normalizePendingOrderHours } from "./pending-orders";

export type ShopSettings = {
  name: string;
  slogan: string;
  phone: string;
  email: string;
  mtnPhone: string;
  rccm: string;
  nui: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
  ticketFooter: string;
  terms: string;
  flashDurationDays: number;
  /** 0 = pas d’annulation auto. Sinon libère le stock des commandes PENDING impayées. */
  pendingOrderHours: number;
  /** Destinataire des alertes commande site (chiffres, ex. 237676935195). */
  orderWhatsAppTo: string;
  greenApiId: string;
  greenApiToken: string;
  /** Ex. https://1103.api.green-api.com — copié depuis la console Green API. */
  greenApiUrl: string;
  prefixes: {
    order: string;
    sale: string;
    customer: string;
    supplier: string;
  };
};

export const DEFAULT_SETTINGS: ShopSettings = {
  name: "NERA Beauté & Shop",
  slogan: "Votre Beauté, notre Engagement ❤️",
  phone: "676 93 51 95",
  email: "nerabeaute-shop@gmail.com",
  mtnPhone: "676935195",
  rccm: "CM-NSI-02-2026-B12-00534",
  nui: "M062618760084L",
  address: "Marché Neptune Ahala, face Skymotors",
  city: "Yaoundé",
  country: "Cameroun",
  currency: "FCFA",
  taxEnabled: false,
  taxRate: 0,
  ticketFooter: "Merci pour votre achat. Paiement OM & MoMo. Livraison rapide sous 24h.",
  terms: "Les articles d'hygiène et les mèches ouvertes ne sont ni repris ni échangés.",
  flashDurationDays: 10,
  pendingOrderHours: DEFAULT_PENDING_ORDER_HOURS,
  orderWhatsAppTo: "237676935195",
  greenApiId: "",
  greenApiToken: "",
  greenApiUrl: "",
  prefixes: {
    order: "NERA",
    sale: "POS",
    customer: "CLI",
    supplier: "SUP",
  },
};

type Db = Prisma.TransactionClient | typeof prisma;

const LEGAL_KEYS = ["email", "mtnPhone", "rccm", "nui", "ticketFooter"] as const;

/** NAP public officiel — tickets POS, admin et site doivent rester identiques. */
export function withOfficialNap<T extends Partial<ShopSettings>>(settings: T): T {
  return {
    ...settings,
    name: NERA_IDENTITY.name,
    slogan: NERA_IDENTITY.slogan,
    phone: NERA_IDENTITY.phoneDisplay,
    address: NERA_IDENTITY.streetAddress,
    city: NERA_IDENTITY.addressLocality,
    country: NERA_IDENTITY.addressCountryName,
  };
}

export function mergeShopSettings(stored?: Partial<ShopSettings> | null): ShopSettings {
  const merged: ShopSettings = withOfficialNap({
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    prefixes: { ...DEFAULT_SETTINGS.prefixes, ...(stored?.prefixes ?? {}) },
  });
  for (const key of LEGAL_KEYS) {
    if (!String(merged[key] ?? "").trim()) merged[key] = DEFAULT_SETTINGS[key];
  }
  merged.flashDurationDays = normalizeFlashDurationDays(merged.flashDurationDays);
  merged.pendingOrderHours = normalizePendingOrderHours(merged.pendingOrderHours);
  merged.orderWhatsAppTo = String(merged.orderWhatsAppTo ?? "").replace(/\D/g, "") || DEFAULT_SETTINGS.orderWhatsAppTo;
  merged.greenApiId = String(merged.greenApiId ?? "").trim();
  merged.greenApiToken = String(merged.greenApiToken ?? "").trim();
  merged.greenApiUrl = String(merged.greenApiUrl ?? "").trim().replace(/\/$/, "");
  return merged;
}

async function loadShopSettings(db: Db): Promise<ShopSettings> {
  const row = await db.setting.findUnique({ where: { key: "shop" } });
  if (!row) return DEFAULT_SETTINGS;
  return mergeShopSettings(row.value as Partial<ShopSettings>);
}

const cachedShopSettings = cache(() => loadShopSettings(prisma));

export async function getShopSettings(db: Db = prisma): Promise<ShopSettings> {
  if (db !== prisma) return loadShopSettings(db);
  return cachedShopSettings();
}

export async function saveShopSettings(value: ShopSettings) {
  const next = mergeShopSettings(value);
  await prisma.setting.upsert({
    where: { key: "shop" },
    update: { value: next },
    create: { key: "shop", value: next },
  });
}

export function toReceiptShop(settings: ShopSettings) {
  const shop = mergeShopSettings(settings);
  return {
    name: shop.name,
    slogan: shop.slogan,
    address: shop.address,
    city: `${shop.city}, ${shop.country}`,
    phone: shop.phone,
    email: shop.email,
    mtnPhone: shop.mtnPhone,
    rccm: shop.rccm,
    nui: shop.nui,
    ticketFooter: shop.ticketFooter,
  };
}

export async function getDefaultLocationId() {
  const loc = await prisma.location.findFirst({
    where: { isDefault: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!loc) throw new Error("Aucun magasin par défaut n'est configuré");
  return loc.id;
}
