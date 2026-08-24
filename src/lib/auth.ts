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

async function signToken(payload: StaffSession | CustomerSession) {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
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

  const token = await signToken(session);
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
  const token = await signToken(session);
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

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken<StaffSession>(token);
  if (!session || session.kind !== "staff") return null;
  return session;
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken<CustomerSession>(token);
  if (!session || session.kind !== "customer") return null;
  return session;
}

export async function clearStaffSession() {
  const jar = await cookies();
  jar.delete(STAFF_COOKIE);
}

export async function clearCustomerSession() {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}

export const COOKIES = { STAFF_COOKIE, CUSTOMER_COOKIE };
