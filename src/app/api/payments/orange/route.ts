import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orangePaymentRefused, orangePaymentStatus, orangePaymentSucceeded, readOrangeReference } from "@/lib/payments/orange-money";
import { orangeWebhookAuthorized } from "@/lib/payments/orange-webhook";
import { collectCompletedOrderPayment, recordPaymentRefusal } from "@/services/order.service";
import { reportError } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function readPayToken(body: unknown) {
  return readOrangeReference(body);
}

export async function POST(request: Request) {
  const key = new URL(request.url).searchParams.get("k");
  if (!orangeWebhookAuthorized(key)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => null);
  const payToken = readPayToken(body);
  if (!payToken) return NextResponse.json({ ok: false }, { status: 400 });
  const payment = await prisma.payment.findFirst({
    where: { reference: payToken, status: "PENDING", orderId: { not: null } },
    select: { id: true, orderId: true, order: { select: { number: true } } },
  });
  if (!payment?.orderId || !payment.order) return NextResponse.json({ ok: true, ignored: true });
  try {
    const status = await orangePaymentStatus(payToken);
    if (orangePaymentRefused(status)) {
      await recordPaymentRefusal({
        paymentId: payment.id,
        orderNumber: payment.order.number,
        network: "ORANGE",
        balance: true,
      });
      return NextResponse.json({ ok: true, status });
    }
    if (!orangePaymentSucceeded(status)) return NextResponse.json({ ok: true, status: status ?? "PENDING" });
    try {
      await collectCompletedOrderPayment({
        orderId: payment.orderId,
        userId: "",
        cashierName: "Orange Money",
      });
    } catch (err) {
      const done = await prisma.payment.findFirst({
        where: { id: payment.id, status: "COMPLETED" },
        select: { id: true },
      });
      if (!done) throw err;
    }
  } catch (err) {
    reportError("orange-webhook", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
