"use server";

import { redirect } from "next/navigation";
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

export async function loginStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.deletedAt) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  await createStaffSession(user.id);
  redirect(next.startsWith("/") ? next : "/admin");
}

export async function logoutStaff() {
  await clearStaffSession();
  redirect("/login");
}

export async function loginCustomer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer?.passwordHash || !customer.isActive) {
    redirect("/compte/connexion?error=1");
  }
  const ok = await verifyPassword(password, customer.passwordHash);
  if (!ok) redirect("/compte/connexion?error=1");
  await createCustomerSession(customer.id);
  redirect("/compte");
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
  const settings = await getShopSettings();
  const customer = await prisma.$transaction(async (tx) => {
    const seq = await nextSequence(tx, "customer");
    return tx.customer.create({
      data: {
        code: formatRef(settings.prefixes.customer, seq.year, seq.value),
        firstName,
        lastName,
        email,
        phone: phone || null,
        passwordHash: await hashPassword(password),
      },
    });
  });
  await createCustomerSession(customer.id);
  redirect("/compte");
}

export async function logoutCustomer() {
  await clearCustomerSession();
  redirect("/");
}
