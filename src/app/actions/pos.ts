"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { PaymentMethod, Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/guard";
import { cancelSale, createPosSale, refundSale } from "@/services/sale.service";
import { closeCashSession, ensureOpenCashSession, getOpenSessionForUser, recordTillExpense } from "@/services/cash.service";
import { createCustomerRecord, findOrCreateWalkInCustomer, lookupPosCustomer } from "@/services/customer.service";
import { parseCfaInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { HeldTicketPayload } from "@/lib/pos";
import { isMissingHeldTicketStore, listHeldTickets, type HeldTicketRow } from "@/services/held-ticket.service";

export { listHeldTickets, type HeldTicketRow };

function posVariantSelect(locationId?: string | null) {
  return {
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
    inventories: {
      where: { locationId: locationId || "__none__" },
      select: { onHand: true, reserved: true },
    },
  } as const;
}

const posActiveWhere = {
  isActive: true,
  deletedAt: null,
  product: { status: "ACTIVE" as const, deletedAt: null },
};

async function posLocationId(userId: string) {
  const open = await getOpenSessionForUser(userId);
  return open?.register.locationId ?? null;
}

export async function searchPosProducts(query: string) {
  const session = await requireStaff("pos.access");
  const locationId = await posLocationId(session.userId);
  const select = posVariantSelect(locationId);
  const q = query.trim();
  if (!q) {
    return prisma.productVariant.findMany({
      where: posActiveWhere,
      select,
      take: 24,
      orderBy: { product: { name: "asc" } },
    });
  }
  return prisma.productVariant.findMany({
    where: {
      ...posActiveWhere,
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { equals: q } },
        { name: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select,
    take: 30,
  });
}

export async function scanPosBarcode(code: string) {
  const session = await requireStaff("pos.access");
  const q = code.trim();
  if (!q) return { ok: false as const, error: "Scannez un code-barres." };
  const variant = await prisma.productVariant.findFirst({
    where: {
      ...posActiveWhere,
      OR: [{ barcode: q }, { sku: { equals: q, mode: "insensitive" } }],
    },
    select: posVariantSelect(await posLocationId(session.userId)),
  });
  if (!variant) return { ok: false as const, error: `Code inconnu : ${q}` };
  return { ok: true as const, variant };
}

function bouncePos(kind: "ok" | "erreur", message?: string): never {
  const q = new URLSearchParams();
  if (message) q.set(kind, message);
  redirect(`/pos${q.toString() ? `?${q}` : ""}`);
}

export async function openRegister(formData: FormData) {
  try {
    const session = await requireStaff("pos.access");
    const openingFloat = parseCfaInput(String(formData.get("openingFloat") ?? "0"));
    await ensureOpenCashSession(session.userId, openingFloat);
    revalidatePath("/pos");
    bouncePos("ok", "Caisse ouverte.");
  } catch (err) {
    unstable_rethrow(err);
    bouncePos("erreur", err instanceof Error ? err.message : "Ouverture de caisse impossible.");
  }
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
  lines: { variantId: string; quantity: number; discount?: number }[];
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

export async function searchPosCustomer(phone: string) {
  await requireStaff("customers.view");
  if (!phone.trim()) return null;
  return lookupPosCustomer(phone);
}

export async function createPosCustomer(input: { firstName: string; lastName?: string; phone: string }) {
  try {
    await requireStaff("customers.create");
    const customer = await createCustomerRecord({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    });
    revalidatePath("/admin/clients");
    return { ok: true as const, customer };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false as const, error: err instanceof Error ? err.message : "Création impossible." };
  }
}

export async function parkPosTicket(input: { note?: string; payload: HeldTicketPayload }) {
  try {
    const session = await requireStaff("pos.access");
    if (!input.payload.lines.length) return { ok: false as const, error: "Le ticket est vide." };
    const open = await getOpenSessionForUser(session.userId);
    const count = await prisma.heldTicket.count({ where: { cashierId: session.userId } });
    if (count >= 20) return { ok: false as const, error: "Trop de tickets en attente (20 max). Encaisser ou reprendre d’abord." };
    const note =
      input.note?.trim() ||
      input.payload.customerName.trim() ||
      `Ticket ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const row = await prisma.heldTicket.create({
      data: {
        cashierId: session.userId,
        cashSessionId: open?.id,
        note,
        payload: input.payload as unknown as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/pos");
    return {
      ok: true as const,
      ticket: {
        id: row.id,
        note: row.note,
        createdAt: row.createdAt,
        payload: input.payload,
      } satisfies HeldTicketRow,
    };
  } catch (err) {
    unstable_rethrow(err);
    if (isMissingHeldTicketStore(err)) {
      return { ok: false as const, error: "Tickets en attente indisponibles. Encaisser le ticket actuel." };
    }
    return { ok: false as const, error: err instanceof Error ? err.message : "Mise en attente impossible." };
  }
}

export async function discardHeldTicket(id: string) {
  try {
    const session = await requireStaff("pos.access");
    const row = await prisma.heldTicket.findUnique({ where: { id } });
    if (!row) return { ok: false as const, error: "Ticket introuvable." };
    if (row.cashierId !== session.userId && !session.isSuperAdmin) {
      return { ok: false as const, error: "Ce ticket appartient à une autre caisse." };
    }
    await prisma.heldTicket.delete({ where: { id } });
    revalidatePath("/pos");
    return { ok: true as const };
  } catch (err) {
    unstable_rethrow(err);
    if (isMissingHeldTicketStore(err)) return { ok: false as const, error: "Tickets en attente indisponibles." };
    return { ok: false as const, error: err instanceof Error ? err.message : "Suppression impossible." };
  }
}

export async function resumeHeldTicket(id: string) {
  try {
    const session = await requireStaff("pos.access");
    const row = await prisma.heldTicket.findUnique({ where: { id } });
    if (!row) return { ok: false as const, error: "Ticket introuvable." };
    if (row.cashierId !== session.userId && !session.isSuperAdmin) {
      return { ok: false as const, error: "Ce ticket appartient à une autre caisse." };
    }
    revalidatePath("/pos");
    return {
      ok: true as const,
      ticket: {
        id: row.id,
        note: row.note,
        createdAt: row.createdAt,
        payload: row.payload as HeldTicketPayload,
      } satisfies HeldTicketRow,
    };
  } catch (err) {
    unstable_rethrow(err);
    if (isMissingHeldTicketStore(err)) return { ok: false as const, error: "Tickets en attente indisponibles." };
    return { ok: false as const, error: err instanceof Error ? err.message : "Reprise impossible." };
  }
}

export async function searchPosSales(query: string) {
  await requireStaff("sales.view");
  const q = query.trim();
  const customer = q ? await lookupPosCustomer(q) : null;
  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              ...(customer ? [{ customerId: customer.id }] : []),
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      number: true,
      total: true,
      createdAt: true,
      customer: { select: { firstName: true, lastName: true, phone: true } },
      items: { select: { productName: true, quantity: true, total: true } },
      payments: { select: { method: true, amount: true } },
    },
  });
  return sales;
}

export async function refundPosSale(saleId: string) {
  try {
    const session = await requireStaff("sales.refund");
    if (!saleId) return { ok: false as const, error: "Vente manquante." };
    await refundSale({ saleId, userId: session.userId, restock: true });
    revalidatePath("/pos");
    revalidatePath("/admin/ventes");
    revalidatePath("/admin/stocks");
    revalidatePath("/admin/clients");
    return { ok: true as const };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false as const, error: err instanceof Error ? err.message : "Remboursement impossible." };
  }
}

export async function refundPosSaleForm(formData: FormData) {
  const saleId = String(formData.get("saleId") ?? "");
  try {
    const session = await requireStaff("sales.refund");
    if (!saleId) bounceVentes("erreur", "Vente manquante.");
    await refundSale({ saleId, userId: session.userId, restock: true });
    revalidatePath("/admin/ventes");
    revalidatePath("/pos");
    revalidatePath("/admin/stocks");
    bounceVentes("ok", "Vente remboursée et stock remis.");
  } catch (err) {
    unstable_rethrow(err);
    bounceVentes("erreur", err instanceof Error ? err.message : "Remboursement impossible.");
  }
}
