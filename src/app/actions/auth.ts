"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  clearCustomerSession,
  clearStaffSession,
  createCustomerSession,
  createStaffSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { formatRef, nextSequence } from "@/lib/sequences";
import { getShopSettings } from "@/lib/settings";
import { defaultStaffPath } from "@/lib/permissions";
import { safeNextPath } from "@/lib/safe-path";
import { attachGuestOrdersByPhone } from "@/services/customer.service";

export async function loginStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user || !user.isActive || user.deletedAt) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  try {
    await createStaffSession(user.id);
  } catch {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const sessionLike = {
    isSuperAdmin: user.role.isSuperAdmin,
    permissions: user.role.permissions.map((p) => p.permission.code),
  };
  const requested = safeNextPath(next, "/admin");
  const dest =
    requested === "/admin" || requested === "/admin/"
      ? defaultStaffPath(sessionLike)
      : requested;
  redirect(dest);
}

export async function logoutStaff() {
  await clearStaffSession();
  redirect("/login");
}

export async function loginCustomer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/compte");
  const fail = `/compte/connexion?error=1&next=${encodeURIComponent(next)}`;
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer?.passwordHash || !customer.isActive) {
    const staff = await prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (staff) redirect("/login?hint=staff");
    redirect(fail);
  }
  const ok = await verifyPassword(password, customer.passwordHash);
  if (!ok) redirect(fail);
  await createCustomerSession(customer.id);
  if (customer.phone) await attachGuestOrdersByPhone(customer.id, customer.phone);
  const dest = safeNextPath(next, "/compte");
  redirect(dest.startsWith("/admin") || dest.startsWith("/pos") || dest.startsWith("/login") ? "/compte" : dest);
}

export async function registerCustomer(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!firstName || !lastName || !email || password.length < 8) {
    redirect("/compte/inscription?error=1");
  }
  const exists = await prisma.customer.findUnique({ where: { email } });
  if (exists) redirect("/compte/inscription?error=exists");
  if (phone) {
    const phoneTaken = await prisma.customer.findFirst({
      where: { phone, deletedAt: null },
      select: { id: true },
    });
    if (phoneTaken) redirect("/compte/inscription?error=exists");
  }
  const passwordHash = await hashPassword(password);
  const settings = await getShopSettings();
  try {
    const customer = await prisma.$transaction(async (tx) => {
      const seq = await nextSequence(tx, "customer");
      return tx.customer.create({
        data: {
          code: formatRef(settings.prefixes.customer, seq.year, seq.value),
          firstName,
          lastName,
          email,
          phone: phone || null,
          passwordHash,
        },
      });
    });
    await createCustomerSession(customer.id);
    if (phone) await attachGuestOrdersByPhone(customer.id, phone);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      redirect("/compte/inscription?error=exists");
    }
    throw err;
  }
  redirect("/compte");
}

export async function logoutCustomer() {
  await clearCustomerSession();
  redirect("/");
}
