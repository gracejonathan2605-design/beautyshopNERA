"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { PaymentMethod } from "@prisma/client";
import { requireStaff } from "@/lib/guard";
import { cancelSale, createPosSale } from "@/services/sale.service";
import { closeCashSession, ensureOpenCashSession, getOpenSessionForUser, recordTillExpense } from "@/services/cash.service";
import { findOrCreateWalkInCustomer } from "@/services/customer.service";
import { parseCfaInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function searchPosProducts(query: string) {
  await requireStaff("pos.access");
  const q = query.trim();
  const where = {
    isActive: true,
    deletedAt: null,
    product: { status: "ACTIVE" as const, deletedAt: null },
  };
  const posSelect = {
    id: true,
    name: true,
    sku: true,
    barcode: true,
    salePrice: true,
    promoPrice: true,
    product: {
      select: {
        name: true,
        images: { where: { kind: "IMAGE" as const }, orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
      },
    },
    inventories: { select: { onHand: true, reserved: true } },
  } as const;
  if (!q) {
    return prisma.productVariant.findMany({
      where,
      select: posSelect,
      take: 24,
      orderBy: { product: { name: "asc" } },
    });
  }
  return prisma.productVariant.findMany({
    where: {
      ...where,
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { equals: q } },
        { name: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: posSelect,
    take: 30,
  });
}

function bouncePos(kind: "ok" | "erreur", message?: string): never {
  const q = new URLSearchParams();
  if (message) q.set(kind, message);
  redirect(`/pos${q.toString() ? `?${q}` : ""}`);
}

export async function openRegister(formData: FormData) {
  const session = await requireStaff("pos.access");
  const openingFloat = parseCfaInput(String(formData.get("openingFloat") ?? "0"));
  await ensureOpenCashSession(session.userId, openingFloat);
  revalidatePath("/pos");
  bouncePos("ok", "Caisse ouverte.");
}

export async function closeRegister(formData: FormData) {
  try {
    const session = await requireStaff("pos.access");
    const open = await getOpenSessionForUser(session.userId);
    if (!open) bouncePos("erreur", "Aucune session ouverte.");
    if (open.openedById !== session.userId && !session.isSuperAdmin) {
      bouncePos("erreur", "Seul celui qui a ouvert la caisse (ou l’admin) peut la fermer.");
    }
    const raw = String(formData.get("actualCash") ?? "").trim();
    const actualCash = raw === "" ? null : parseCfaInput(raw);
    await closeCashSession({
      sessionId: open.id,
      userId: session.userId,
      actualCash,
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    revalidatePath("/pos");
    revalidatePath("/admin/ventes");
    revalidatePath("/admin/depenses");
    bouncePos("ok", "Caisse fermée.");
  } catch (err) {
    unstable_rethrow(err);
    bouncePos("erreur", err instanceof Error ? err.message : "Fermeture impossible.");
  }
}

export async function addTillExpense(formData: FormData) {
  try {
    const session = await requireStaff("pos.access");
    const amount = parseCfaInput(String(formData.get("amount") ?? ""));
    const description = String(formData.get("description") ?? "").trim();
    if (!amount) bouncePos("erreur", "Indiquez un montant de dépense valide.");
    if (!description) bouncePos("erreur", "Indiquez le motif de la dépense (taxi, eau, etc.).");
    await recordTillExpense({
      userId: session.userId,
      amount,
      description,
      categoryId: String(formData.get("categoryId") ?? "") || null,
    });
    revalidatePath("/pos");
    revalidatePath("/admin/depenses");
    bouncePos("ok", "Dépense enregistrée et déduite des recettes.");
  } catch (err) {
    unstable_rethrow(err);
    bouncePos("erreur", err instanceof Error ? err.message : "Dépense impossible.");
  }
}

export type PosSaleResult =
  | {
      ok: true;
      sale: Awaited<ReturnType<typeof createPosSale>>;
    }
  | { ok: false; error: string };

export async function submitPosSale(input: {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discount?: number;
  notes?: string;
  lines: { variantId: string; quantity: number }[];
  payments: { method: PaymentMethod; amount: number }[];
}): Promise<PosSaleResult> {
  try {
    const session = await requireStaff("pos.access");
    if (!input.lines.length) return { ok: false, error: "Ajoutez au moins un produit au ticket." };
    const open = await getOpenSessionForUser(session.userId);
    if (!open) return { ok: false, error: "Ouvrez d’abord la caisse avec le fond du matin." };
    const locationId = open.register.locationId;
    let customerId = input.customerId;
    if (!customerId && (input.customerPhone?.trim() || input.customerName?.trim())) {
      const customer = await findOrCreateWalkInCustomer({
        name: input.customerName,
        phone: input.customerPhone,
      });
      customerId = customer?.id;
    }
    const sale = await createPosSale({
      cashierId: session.userId,
      locationId,
      cashSessionId: open.id,
      customerId,
      discount: input.discount,
      notes: input.notes,
      lines: input.lines,
      payments: input.payments,
    });
    revalidatePath("/pos");
    revalidatePath("/admin/ventes");
    revalidatePath("/admin/clients");
    return { ok: true, sale };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: err instanceof Error ? err.message : "Encaissement impossible." };
  }
}

function bounceVentes(kind: "ok" | "erreur", message: string): never {
  const q = new URLSearchParams();
  q.set(kind, message);
  redirect(`/admin/ventes?${q.toString()}`);
}

export async function cancelPosSale(formData: FormData) {
  try {
    const session = await requireStaff("sales.cancel");
    const saleId = String(formData.get("saleId") ?? "");
    if (!saleId) bounceVentes("erreur", "Vente manquante.");
    await cancelSale({ saleId, userId: session.userId, restock: true });
    revalidatePath("/admin/ventes");
    revalidatePath("/pos");
    revalidatePath("/admin/stocks");
    bounceVentes("ok", "Vente annulée et stock remis.");
  } catch (err) {
    unstable_rethrow(err);
    bounceVentes("erreur", err instanceof Error ? err.message : "Annulation impossible.");
  }
}

export async function findCustomerByPhone(phone: string) {
  await requireStaff("customers.view");
  if (!phone.trim()) return null;
  return prisma.customer.findFirst({
    where: { phone: { contains: phone.trim() }, isActive: true, deletedAt: null },
  });
}
