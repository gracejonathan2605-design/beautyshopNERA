import { cache } from "react";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { PermissionCode } from "./permissions";

const STAFF_COOKIE = "nera_staff";
const CUSTOMER_COOKIE = "nera_customer";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(value);
}

export type StaffSession = {
  kind: "staff";
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: PermissionCode[];
};

export type CustomerSession = {
  kind: "customer";
  customerId: string;
  email: string | null;
  firstName: string;
  lastName: string;
};

async function signToken(payload: StaffSession | CustomerSession, expires: string) {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret());
}

export async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createStaffSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (!user || !user.isActive || user.deletedAt) {
    throw new Error("Compte inactif");
  }

  const session: StaffSession = {
    kind: "staff",
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleId: user.roleId,
    roleName: user.role.name,
    isSuperAdmin: user.role.isSuperAdmin,
    permissions: user.role.permissions.map((p) => p.permission.code as PermissionCode),
  };

  const token = await signToken(session, "12h");
  const jar = await cookies();
  jar.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return session;
}

export async function createCustomerSession(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || !customer.isActive || customer.deletedAt) {
    throw new Error("Compte inactif");
  }
  const session: CustomerSession = {
    kind: "customer",
    customerId: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
  };
  const token = await signToken(session, "14d");
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return session;
}

async function readStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken<StaffSession>(token);
  if (!session || session.kind !== "staff") return null;
  const live = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      isActive: true,
      deletedAt: true,
      email: true,
      firstName: true,
      lastName: true,
      roleId: true,
      role: {
        select: {
          name: true,
          isSuperAdmin: true,
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  });
  if (!live?.isActive || live.deletedAt) return null;
  return {
    kind: "staff",
    userId: session.userId,
    email: live.email,
    firstName: live.firstName,
    lastName: live.lastName,
    roleId: live.roleId,
    roleName: live.role.name,
    isSuperAdmin: live.role.isSuperAdmin,
    permissions: live.role.permissions.map((p) => p.permission.code as PermissionCode),
  };
}

async function readCustomerSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken<CustomerSession>(token);
  if (!session || session.kind !== "customer") return null;
  const live = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: { isActive: true, deletedAt: true },
  });
  if (!live?.isActive || live.deletedAt) return null;
  return session;
}

export const getStaffSession = cache(readStaffSession);
export const getCustomerSession = cache(readCustomerSession);

export async function clearStaffSession() {
  const jar = await cookies();
  jar.delete({ name: STAFF_COOKIE, path: "/" });
}

export async function clearCustomerSession() {
  const jar = await cookies();
  jar.delete({ name: CUSTOMER_COOKIE, path: "/" });
}

export const COOKIES = { STAFF_COOKIE, CUSTOMER_COOKIE };
