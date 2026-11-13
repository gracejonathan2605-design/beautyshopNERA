type PendingPayment = { id: string; provider: string; status: string };

export function parseMomoWebhook(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  const orderNumber = typeof row.orderNumber === "string" ? row.orderNumber.trim() : "";
  if (
    !orderNumber ||
    orderNumber.length > 64 ||
    row.status !== "COMPLETED" ||
    typeof row.amount !== "number" ||
    !Number.isSafeInteger(row.amount) ||
    row.amount < 0
  ) {
    return null;
  }
  return { orderNumber, amount: row.amount };
}

export function matchingMomoPayment(
  amount: number,
  orderTotal: number,
  payments: PendingPayment[],
) {
  if (amount !== orderTotal) return null;
  return payments.find((payment) => payment.status === "PENDING" && payment.provider === "MTN") ?? null;
}
