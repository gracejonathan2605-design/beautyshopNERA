"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { PaymentMethod, Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/guard";
import { cancelSale, createPosSale, refundSale } from "@/services/sale.service";
import {
  closeCashSession,
  ensureOpenCashSession,
  getOpenCashSessionById,
  getOpenSessionForUser,
  getOccupiedCashSession,
  recordTillExpense,
} from "@/services/cash.service";
import { createCustomerRecord, findOrCreateWalkInCustomer, lookupPosCustomer } from "@/services/customer.service";
import { formatCfa, parseCfaInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { scanMatchDecision, type HeldTicketPayload } from "@/lib/pos";
import { canCloseCashSession, type TillSnapshot } from "@/lib/till";
import { hasPermission } from "@/lib/permissions";
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
  const matches = await prisma.productVariant.findMany({
    where: {
      ...posActiveWhere,
      OR: [{ barcode: q }, { sku: { equals: q, mode: "insensitive" } }],
    },
    select: posVariantSelect(await posLocationId(session.userId)),
    take: 8,
  });
  const decision = scanMatchDecision(matches, q);
  if (!decision.ok) return { ok: false as const, error: decision.error };
  return { ok: true as const, variant: decision.item };
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
    bouncePos("ok", "Caisse ouverte. Vous pouvez la fermer à tout moment, puis la rouvrir.");
  } catch (err) {
    unstable_rethrow(err);
    bouncePos("erreur", err instanceof Error ? err.message : "Ouverture de caisse impossible.");
  }
}

export async function closeRegister(formData: FormData) {
  try {
    const session = await requireStaff("pos.access");
    const requestedId = String(formData.get("sessionId") ?? "").trim();
    const mine = await getOpenSessionForUser(session.userId);
    const canForce = session.isSuperAdmin || hasPermission(session, "sales.cancel");
    const occupied = canForce ? await getOccupiedCashSession(session.userId) : null;
    const target = requestedId ? await getOpenCashSessionById(requestedId) : mine ?? occupied;
    if (!target) bouncePos("erreur", "Aucune caisse ouverte à fermer.");
    if (
      !canCloseCashSession({
        openedById: target.openedById,
        userId: session.userId,
        isSuperAdmin: session.isSuperAdmin,
        canForce,
      })
    ) {
      bouncePos("erreur", "Seul celui qui a ouvert la caisse (ou le responsable) peut la fermer.");
    }
    const raw = String(formData.get("actualCash") ?? "").trim();
    const actualCash = raw === "" ? null : parseCfaInput(raw);
    const closed = await closeCashSession({
      sessionId: target.id,
      userId: session.userId,
      actualCash,
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    revalidatePath("/pos");
    revalidatePath("/admin/ventes");
    revalidatePath("/admin/depenses");
    const gap =
      closed.difference === 0
        ? formatCfa(0)
        : `${closed.difference > 0 ? "+" : "−"}${formatCfa(Math.abs(closed.difference))}`;
    bouncePos(
      "ok",
      `Caisse fermée. Espèces attendues ${formatCfa(closed.expectedCash)} · comptées ${formatCfa(closed.actualCash)} · écart ${gap}. Vous pouvez la rouvrir tout de suite.`,
    );
  } catch (err) {
    unstable_rethrow(err);
    bouncePos("erreur", err instanceof Error ? err.message : "Fermeture impossible.");
  }
}

export type TillExpenseResult =
  | { ok: true; snapshot: TillSnapshot; message: string }
  | { ok: false; error: string };

export async function addTillExpense(formData: FormData): Promise<TillExpenseResult> {
  try {
    const session = await requireStaff("pos.access");
    const amount = parseCfaInput(String(formData.get("amount") ?? ""));
    const description = String(formData.get("description") ?? "").trim();
    if (!amount) return { ok: false, error: "Indiquez un montant de dépense valide." };
    if (!description) return { ok: false, error: "Indiquez le motif de la dépense (taxi, eau, etc.)." };
    const { snapshot, expense } = await recordTillExpense({
      userId: session.userId,
      amount,
      description,
      categoryId: String(formData.get("categoryId") ?? "") || null,
      sessionId: String(formData.get("sessionId") ?? "") || null,
      isSuperAdmin: session.isSuperAdmin,
      canForce: session.isSuperAdmin || hasPermission(session, "sales.cancel"),
    });
    revalidatePath("/pos");
    revalidatePath("/admin/depenses");
    return {
      ok: true,
      snapshot,
      message: `Dépense de ${formatCfa(expense.amount)} déduite. Espèces attendues : ${formatCfa(snapshot.expectedCash)}.`,
    };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: err instanceof Error ? err.message : "Dépense impossible." };
  }
}

export async function submitTillExpense(
  _prev: TillExpenseResult | null,
  formData: FormData,
): Promise<TillExpenseResult> {
  return addTillExpense(formData);
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
  heldTicketId?: string;
  lines: { variantId: string; quantity: number; discount?: number }[];
  payments: { method: PaymentMethod; amount: number }[];
}): Promise<PosSaleResult> {
  try {
    const session = await requireStaff("pos.access", "sales.create");
    if (!input.lines.length) return { ok: false, error: "Ajoutez au moins un produit au ticket." };
    const open = await getOpenSessionForUser(session.userId);
    if (!open) return { ok: false, error: "Ouvrez d’abord la caisse (fond du tiroir)." };
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
      heldTicketId: input.heldTicketId,
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

export async function parkPosTicket(input: {
  note?: string;
  payload: HeldTicketPayload;
  heldTicketId?: string;
}) {
  try {
    const session = await requireStaff("pos.access");
    if (!input.payload.lines.length) return { ok: false as const, error: "Le ticket est vide." };
    const open = await getOpenSessionForUser(session.userId);
    const note =
      input.note?.trim() ||
      input.payload.customerName.trim() ||
      `Ticket ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const payload = input.payload as unknown as Prisma.InputJsonValue;
    const existingId = input.heldTicketId?.trim();
    let row: { id: string; note: string | null; createdAt: Date };
    if (existingId) {
      const updated = await prisma.heldTicket.updateMany({
        where: { id: existingId, cashierId: session.userId },
        data: { note, payload, cashSessionId: open?.id },
      });
      if (updated.count !== 1) {
        return { ok: false as const, error: "Ce ticket en attente a déjà été encaissé ou retiré." };
      }
      const existing = await prisma.heldTicket.findUnique({ where: { id: existingId } });
      if (!existing) return { ok: false as const, error: "Ticket introuvable." };
      row = existing;
    } else {
      const count = await prisma.heldTicket.count({ where: { cashierId: session.userId } });
      if (count >= 20) {
        return { ok: false as const, error: "Trop de tickets en attente (20 max). Encaisser ou reprendre d’abord." };
      }
      row = await prisma.heldTicket.create({
        data: {
          cashierId: session.userId,
          cashSessionId: open?.id,
          note,
          payload,
        },
      });
    }
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
