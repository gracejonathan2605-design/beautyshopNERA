export const DEFAULT_PENDING_ORDER_HOURS = 24;
export const MAX_PENDING_ORDER_HOURS = 168;

/** 0 = désactivé. Sinon 1–168 heures (7 jours). */
export function normalizePendingOrderHours(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PENDING_ORDER_HOURS;
  return Math.min(MAX_PENDING_ORDER_HOURS, Math.round(n));
}

export function unpaidOrderCutoff(now: Date, hours: number) {
  const h = normalizePendingOrderHours(hours);
  if (h <= 0) return null;
  return new Date(now.getTime() - h * 60 * 60 * 1000);
}

export function shouldReleaseUnpaidOrder(input: {
  status: string;
  createdAt: Date;
  cutoff: Date;
  hasCompletedPayment: boolean;
}) {
  if (input.status !== "PENDING") return false;
  if (input.hasCompletedPayment) return false;
  return input.createdAt.getTime() <= input.cutoff.getTime();
}
