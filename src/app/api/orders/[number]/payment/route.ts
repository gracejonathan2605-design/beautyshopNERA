import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth";
import { isValidOrderAccessToken } from "@/lib/order-access";
import { rateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/monitor";
import { orangePaymentRefused, orangePaymentStatus, orangePaymentSucceeded } from "@/lib/payments/orange-money";
import { paymentBadgeFromNote, paymentNoteIsRefusal } from "@/lib/payments/payment-help";
import { collectCompletedOrderPayment, recordPaymentRefusal } from "@/services/order.service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PLACEHOLDERS = new Set(["ORANGE", "MTN"]);

export async function GET(request: Request, context: { params: Promise<{ number: string }> }) {
  const { number } = await context.params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const [order, session] = await Promise.all([
    prisma.order.findUnique({
      where: { number },
      include: { payments: true },
    }),
    getCustomerSession().catch(() => null),
  ]);
  const allowed =
    order &&
    (isValidOrderAccessToken(number, token) || (session && order.customerId === session.customerId));
  if (!order || !allowed) return NextResponse.json({ state: "pending" }, { status: 404 });

  const paid = order.payments.some((payment) => payment.status === "COMPLETED");
  if (paid) return NextResponse.json({ state: "paid" });
  const payment = order.payments.find((row) => row.status === "PENDING") ?? order.payments[0];
  if (!payment) return NextResponse.json({ state: "pending" });
  const reference = payment.reference?.trim() ?? "";
  const canAskOrange = payment.provider !== "MTN" && reference && !PLACEHOLDERS.has(reference);
  if (!rateLimit(`om-status:${number}`, 20, 60_000)) {
    const state = paymentNoteIsRefusal(payment.note) ? "refused" : "pending";
    return NextResponse.json({ state });
  }
  if (canAskOrange) {
    try {
      const status = await orangePaymentStatus(reference);
      if (orangePaymentSucceeded(status)) {
        try {
          await collectCompletedOrderPayment({
            orderId: order.id,
            userId: "",
            cashierName: "Orange Money",
          });
        } catch (err) {
          const done = await prisma.payment.findFirst({
            where: { orderId: order.id, status: "COMPLETED" },
            select: { id: true },
          });
          if (!done) throw err;
        }
        return NextResponse.json({ state: "paid" });
      }
      if (orangePaymentRefused(status)) {
        await recordPaymentRefusal({
          paymentId: payment.id,
          orderNumber: order.number,
          network: "ORANGE",
          balance: true,
        });
        return NextResponse.json({ state: "refused" });
      }
    } catch (err) {
      reportError("orange-money", err);
    }
  }

  const state = paymentBadgeFromNote(false, payment.note) === "refused" ? "refused" : "pending";
  return NextResponse.json({ state });
}
