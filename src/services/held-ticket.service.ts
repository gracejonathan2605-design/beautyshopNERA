import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { HeldTicketPayload } from "@/lib/pos";

export type HeldTicketRow = {
  id: string;
  note: string | null;
  createdAt: Date;
  payload: HeldTicketPayload;
};

export function isMissingHeldTicketStore(err: unknown) {
  if (err instanceof TypeError) return true;
  return err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2010");
}

export async function listHeldTickets(cashierId: string): Promise<HeldTicketRow[]> {
  try {
    if (typeof prisma.heldTicket?.findMany !== "function") return [];
    const rows = await prisma.heldTicket.findMany({
      where: { cashierId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, note: true, createdAt: true, payload: true },
    });
    return rows.map((row) => ({
      id: row.id,
      note: row.note,
      createdAt: row.createdAt,
      payload: row.payload as HeldTicketPayload,
    }));
  } catch (err) {
    if (isMissingHeldTicketStore(err)) return [];
    throw err;
  }
}
