import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/settings";
import { formatRef, nextSequence } from "@/lib/sequences";

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

export async function findCustomerByPhone(phone: string) {
  const raw = phone.trim();
  const digits = normalizePhone(raw);
  if (!raw) return null;
  return prisma.customer.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [{ phone: raw }, ...(digits.length >= 8 ? [{ phone: { contains: digits.slice(-8) } }] : [])],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomerRecord(input: {
  firstName: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
}) {
  const firstName = input.firstName.trim();
  const lastName = (input.lastName ?? "").trim();
  const phone = (input.phone ?? "").trim() || null;
  const email = (input.email ?? "").trim().toLowerCase() || null;
  const city = (input.city ?? "").trim() || null;
  const address = (input.address ?? "").trim() || null;
  if (!firstName) throw new Error("Indiquez le nom de la cliente.");
  if (!phone && !email) throw new Error("Indiquez un WhatsApp ou un email.");

  if (phone) {
    const existing = await findCustomerByPhone(phone);
    if (existing) {
      throw new Error(`Ce numéro est déjà utilisé par ${existing.firstName} ${existing.lastName} (${existing.code}).`);
    }
  }
  if (email) {
    const existing = await prisma.customer.findFirst({ where: { email, deletedAt: null } });
    if (existing) throw new Error("Cet email est déjà utilisé.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const settings = await getShopSettings(tx);
      const seq = await nextSequence(tx, "customer");
      return tx.customer.create({
        data: {
          code: formatRef(settings.prefixes.customer, seq.year, seq.value),
          firstName,
          lastName,
          phone,
          email,
          city,
          address,
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("Un client avec cet email existe déjà.");
    }
    throw err;
  }
}

export async function findOrCreateWalkInCustomer(input: { name?: string; phone?: string }) {
  const phone = (input.phone ?? "").trim();
  if (!phone) return null;
  const existing = await findCustomerByPhone(phone);
  if (existing) return existing;
  const parts = (input.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Cliente";
  const lastName = parts.slice(1).join(" ");
  return createCustomerRecord({ firstName, lastName, phone });
}
