import { createHmac, timingSafeEqual } from "crypto";

/** Jeton stable dérivé du secret. Il voyage dans l’URL de notification qu’Orange rappelle. */
export function orangeWebhookKey(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.ORANGE_MONEY_WEBHOOK_SECRET?.trim() || env.AUTH_SECRET?.trim() || "";
  if (!secret) return "";
  return createHmac("sha256", secret).update("nera-orange-webhook-v1").digest("base64url").slice(0, 32);
}

export function orangeWebhookAuthorized(provided: string | null | undefined, env: NodeJS.ProcessEnv = process.env) {
  const expected = orangeWebhookKey(env);
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function orangeNotifPath(env: NodeJS.ProcessEnv = process.env) {
  const key = orangeWebhookKey(env);
  return key ? `/api/payments/orange?k=${encodeURIComponent(key)}` : "/api/payments/orange";
}
