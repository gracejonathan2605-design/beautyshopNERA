import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { rateLimit, rateLimitKeyHash } from "../src/lib/rate-limit";

const enabled = process.env.RATE_LIMIT_INTEGRATION === "true";
const keys: string[] = [];

describe.skipIf(!enabled)("rate limit PostgreSQL partagé", () => {
  afterAll(async () => {
    if (keys.length) {
      await prisma.rateLimitWindow.deleteMany({ where: { key: { in: keys } } });
    }
  });

  it("compte atomiquement les appels concurrents et réinitialise la fenêtre", async () => {
    const key = `integration:${randomUUID()}`;
    keys.push(rateLimitKeyHash(key));
    const now = Date.now();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => rateLimit(key, 3, 1000, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await rateLimit(key, 3, 1000, now + 1001)).toBe(true);
  });
});
