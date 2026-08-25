import { createHmac, timingSafeEqual } from "crypto";

function hmacSecret(explicit?: string) {
  const secret = explicit ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant");
  return secret;
}

export function orderAccessToken(number: string, secret?: string) {
  return createHmac("sha256", hmacSecret(secret)).update(`order:${number}`).digest("base64url").slice(0, 22);
}

export function isValidOrderAccessToken(number: string, token: string | undefined, secret?: string) {
  if (!token) return false;
  const expected = orderAccessToken(number, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function orderConfirmationPath(number: string, secret?: string) {
  return `/commande/${encodeURIComponent(number)}?t=${encodeURIComponent(orderAccessToken(number, secret))}`;
}
