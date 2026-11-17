import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/monitor";

const RATE_LIMIT_WINDOW_RETENTION_MS = 24 * 60 * 60 * 1000;

export function rateLimitKeyHash(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function rateLimitAllowed(count: number, limit: number) {
  return count <= limit;
}

export async function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (!key || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new Error("Limite de débit invalide.");
  }
  const hashedKey = rateLimitKeyHash(key);
  try {
    const [row] = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitWindow" ("key", "windowStartedAt", "count", "updatedAt")
      VALUES (${hashedKey}, to_timestamp(${now}::double precision / 1000) AT TIME ZONE 'UTC', 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitWindow"."windowStartedAt" + (${windowMs} * INTERVAL '1 millisecond')
            <= to_timestamp(${now}::double precision / 1000) AT TIME ZONE 'UTC'
          THEN 1
          ELSE "RateLimitWindow"."count" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "RateLimitWindow"."windowStartedAt" + (${windowMs} * INTERVAL '1 millisecond')
            <= to_timestamp(${now}::double precision / 1000) AT TIME ZONE 'UTC'
          THEN EXCLUDED."windowStartedAt"
          ELSE "RateLimitWindow"."windowStartedAt"
        END,
        "updatedAt" = now()
      RETURNING "count"
    `;
    return row ? rateLimitAllowed(row.count, limit) : false;
  } catch (error) {
    reportError("rate-limit", error);
    return false;
  }
}

export async function pruneRateLimitWindows(now = Date.now()) {
  const cutoff = new Date(now - RATE_LIMIT_WINDOW_RETENTION_MS);
  const result = await prisma.rateLimitWindow.deleteMany({
    where: { windowStartedAt: { lt: cutoff } },
  });
  return result.count;
}
