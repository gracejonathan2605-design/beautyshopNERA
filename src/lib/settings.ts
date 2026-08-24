import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type ShopSettings = {
  name: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
  ticketFooter: string;
  terms: string;
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
  phone: "+237 6 00 00 00 00",
  email: "contact@nerabeaute.cm",
  address: "Marché Central",
  city: "Yaoundé",
  country: "Cameroun",
  currency: "FCFA",
  taxEnabled: false,
  taxRate: 0,
  ticketFooter: "Merci pour votre achat. À très bientôt chez NERA Beauté & Shop.",
  terms: "Les articles d'hygiène et les mèches ouvertes ne sont ni repris ni échangés.",
  prefixes: {
    order: "NERA",
    sale: "POS",
    customer: "CLI",
    supplier: "SUP",
  },
};

type Db = Prisma.TransactionClient | typeof prisma;

export async function getShopSettings(db: Db = prisma): Promise<ShopSettings> {
  const row = await db.setting.findUnique({ where: { key: "shop" } });
  if (!row) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<ShopSettings>) };
}

export async function saveShopSettings(value: ShopSettings) {
  await prisma.setting.upsert({
    where: { key: "shop" },
    update: { value },
    create: { key: "shop", value },
  });
}

export async function getDefaultLocationId() {
  const loc = await prisma.location.findFirst({
    where: { isDefault: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!loc) throw new Error("Aucun magasin par défaut n'est configuré");
  return loc.id;
}
