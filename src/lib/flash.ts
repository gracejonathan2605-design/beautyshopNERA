import type { Prisma } from "@prisma/client";

export const DEFAULT_FLASH_DURATION_DAYS = 10;

export function normalizeFlashDurationDays(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_FLASH_DURATION_DAYS;
  return Math.min(90, Math.max(1, Math.round(n)));
}

export function flashEndFromStart(start: Date, durationDays: number) {
  const days = normalizeFlashDurationDays(durationDays);
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isPublishedOnline(product: {
  status: string;
  onlineVisible: boolean;
  deletedAt?: Date | string | null;
}) {
  return product.status === "ACTIVE" && product.onlineVisible && !product.deletedAt;
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function isFlashActive(
  product: {
    status: string;
    onlineVisible: boolean;
    deletedAt?: Date | string | null;
    flashStartAt?: Date | string | null;
    flashEndAt?: Date | string | null;
  },
  now = new Date(),
) {
  if (!isPublishedOnline(product)) return false;
  const start = asDate(product.flashStartAt);
  const end = asDate(product.flashEndAt);
  if (!start || !end) return false;
  const t = now.getTime();
  return start.getTime() <= t && t < end.getTime();
}

export function flashPrismaWhere(now = new Date()): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE",
    onlineVisible: true,
    deletedAt: null,
    flashStartAt: { lte: now },
    flashEndAt: { gt: now },
  };
}

export function assignFlashOnPublish(input: {
  alreadyStarted?: Date | string | null;
  alreadyEnded?: Date | string | null;
  wasPublished: boolean;
  willBePublished: boolean;
  now?: Date;
  durationDays: number;
}): { flashStartAt: Date | null; flashEndAt: Date | null } {
  const alreadyStarted = asDate(input.alreadyStarted);
  const alreadyEnded = asDate(input.alreadyEnded);
  if (alreadyStarted) {
    return { flashStartAt: alreadyStarted, flashEndAt: alreadyEnded };
  }
  if (!input.willBePublished) {
    return { flashStartAt: null, flashEndAt: null };
  }
  if (input.wasPublished) {
    return { flashStartAt: null, flashEndAt: null };
  }
  const start = input.now ?? new Date();
  return { flashStartAt: start, flashEndAt: flashEndFromStart(start, input.durationDays) };
}

export function remainingMs(flashEndAt: Date | string | null | undefined, now = new Date()) {
  const end = asDate(flashEndAt);
  if (!end) return 0;
  return Math.max(0, end.getTime() - now.getTime());
}

export type FlashUrgency = "normal" | "soon" | "urgent" | "critical" | "expired";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatFlashCountdown(ms: number): { label: string; urgency: FlashUrgency } {
  const remaining = Math.max(0, Math.floor(ms));
  if (remaining <= 0) return { label: "00:00", urgency: "expired" };

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (totalSeconds >= 24 * 3600) {
    return { label: `⏳ Plus que ${days}J ${pad2(hours)}H`, urgency: "normal" };
  }
  if (totalSeconds >= 3600) {
    return { label: `⏳ Plus que ${pad2(hours)}H ${pad2(minutes)}MIN`, urgency: "soon" };
  }
  if (totalSeconds >= 10 * 60) {
    return { label: `⏳ Plus que ${pad2(minutes)}:${pad2(seconds)}`, urgency: "soon" };
  }
  if (totalSeconds >= 60) {
    return { label: `🔥 Plus que ${pad2(minutes)}:${pad2(seconds)}`, urgency: "urgent" };
  }
  return { label: `🔥 ${pad2(minutes)}:${pad2(seconds)}`, urgency: "critical" };
}

export function formatFlashRemainingAdmin(ms: number) {
  const { label } = formatFlashCountdown(ms);
  return label.replace(/^🔥\s*/, "").replace(/^⏳\s*/, "");
}

export type FlashBadge = { kind: "flash" | "promo" | "new"; label: string };

export function flashShopBadges(input: {
  flash: boolean;
  promoPercent: number;
  isPromo?: boolean;
  isNew?: boolean;
}): FlashBadge[] {
  const badges: FlashBadge[] = [];
  if (input.flash) badges.push({ kind: "flash", label: "🔥 FLASH" });
  if (input.promoPercent > 0) badges.push({ kind: "promo", label: `−${input.promoPercent}%` });
  else if (input.isPromo) badges.push({ kind: "promo", label: "PROMO" });
  if (input.isNew) badges.push({ kind: "new", label: "NOUVEAU" });
  return badges.slice(0, 3);
}
