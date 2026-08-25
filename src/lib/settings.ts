import { cache } from "react";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { normalizeFlashDurationDays } from "./flash";

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
  prefixes: {
    order: string;
    sale: string;
    customer: string;
    supplier: string;
  };
};

export const DEFAULT_SETTINGS: ShopSettings = {
  name: "NERA Beauté & Shop",
  slogan: "Beauté, cheveux & mode — Yaoundé",
  phone: "+237 696565654",
  email: "nerabeaute-shop@gmail.com",
  mtnPhone: "676935195",
  rccm: "CM-NSI-02-2026-B12-00534",
  nui: "M062618760084L",
  address: "Marché Central",
  city: "Yaoundé",
  country: "Cameroun",
  currency: "FCFA",
  taxEnabled: false,
  taxRate: 0,
  ticketFooter: "Merci pour votre achat. Paiement OM & MoMo. Livraison rapide sous 24h.",
  terms: "Les articles d'hygiène et les mèches ouvertes ne sont ni repris ni échangés.",
  flashDurationDays: 10,
  prefixes: {
    order: "NERA",
    sale: "POS",
    customer: "CLI",
    supplier: "SUP",
  },
};

type Db = Prisma.TransactionClient | typeof prisma;

const LEGAL_KEYS = ["email", "mtnPhone", "rccm", "nui", "ticketFooter"] as const;

export function mergeShopSettings(stored?: Partial<ShopSettings> | null): ShopSettings {
  const merged: ShopSettings = {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    prefixes: { ...DEFAULT_SETTINGS.prefixes, ...(stored?.prefixes ?? {}) },
  };
  for (const key of LEGAL_KEYS) {
    if (!String(merged[key] ?? "").trim()) merged[key] = DEFAULT_SETTINGS[key];
  }
  merged.flashDurationDays = normalizeFlashDurationDays(merged.flashDurationDays);
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
  await prisma.setting.upsert({
    where: { key: "shop" },
    update: { value },
    create: { key: "shop", value },
  });
}

export function toReceiptShop(settings: ShopSettings) {
  return {
    name: settings.name,
    slogan: settings.slogan,
    address: settings.address,
    city: `${settings.city}, ${settings.country}`,
    phone: settings.phone,
    email: settings.email,
    mtnPhone: settings.mtnPhone,
    rccm: settings.rccm,
    nui: settings.nui,
    ticketFooter: settings.ticketFooter,
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
