"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { PaymentMethod } from "@prisma/client";
import { requireStaff } from "@/lib/guard";
import { createPosSale } from "@/services/sale.service";
import { closeCashSession, ensureOpenCashSession, getOpenSessionForUser } from "@/services/cash.service";
import { prisma } from "@/lib/prisma";

export async function searchPosProducts(query: string) {
  await requireStaff("pos.access");
  const q = query.trim();
  const where = {
    isActive: true,
    deletedAt: null,
    product: { status: "ACTIVE" as const, deletedAt: null },
  };
  const posInclude = {
    product: {
      include: { images: { where: { kind: "IMAGE" as const }, orderBy: { sortOrder: "asc" as const }, take: 1 } },
    },
    inventories: true,
  };
  if (!q) {
    return prisma.productVariant.findMany({
      where,
      include: posInclude,
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
    include: posInclude,
    take: 30,
  });
}

export async function openRegister(formData: FormData) {
  const session = await requireStaff("pos.access");
  await ensureOpenCashSession(session.userId, Number(formData.get("openingFloat") ?? 0));
  revalidatePath("/pos");
}

export async function closeRegister(formData: FormData) {
  const session = await requireStaff("pos.access");
  const open = await getOpenSessionForUser(session.userId);
  if (!open) throw new Error("Aucune session ouverte");
  await closeCashSession({
    sessionId: open.id,
    userId: session.userId,
    actualCash: Number(formData.get("actualCash") ?? 0),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath("/pos");
}

export type PosSaleResult =
  | {
      ok: true;
      sale: Awaited<ReturnType<typeof createPosSale>>;
    }
  | { ok: false; error: string };

export async function submitPosSale(input: {
  customerId?: string;
  discount?: number;
  notes?: string;
  lines: { variantId: string; quantity: number; unitPrice?: number }[];
  payments: { method: PaymentMethod; amount: number }[];
}): Promise<PosSaleResult> {
  try {
    const session = await requireStaff("pos.access");
    if (!input.lines.length) return { ok: false, error: "Ajoutez au moins un produit au ticket." };
    const open = await ensureOpenCashSession(session.userId);
    const locationId = open.register.locationId;
    const sale = await createPosSale({
      cashierId: session.userId,
      locationId,
      cashSessionId: open.id,
      customerId: input.customerId,
      discount: input.discount,
      notes: input.notes,
      lines: input.lines,
      payments: input.payments,
    });
    revalidatePath("/pos");
    revalidatePath("/admin/ventes");
    return { ok: true, sale };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: err instanceof Error ? err.message : "Encaissement impossible." };
  }
}

export async function findCustomerByPhone(phone: string) {
  await requireStaff("customers.view");
  if (!phone.trim()) return null;
  return prisma.customer.findFirst({
    where: { phone: { contains: phone.trim() }, isActive: true, deletedAt: null },
  });
}
