import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orangePaymentStatus, orangePaymentSucceeded } from "@/lib/payments/orange-money";
import { collectCompletedOrderPayment } from "@/services/order.service";
import { reportError } from "@/lib/monitor";

export const dynamic = "force-dynamic";

function readPayToken(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const row = body as { payToken?: string; data?: { payToken?: string } };
  return (row.payToken || row.data?.payToken || "").trim();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payToken = readPayToken(body);
  if (!payToken) return NextResponse.json({ ok: false }, { status: 400 });
  const payment = await prisma.payment.findFirst({
    where: { reference: payToken, status: "PENDING", orderId: { not: null } },
    select: { orderId: true },
  });
  if (!payment?.orderId) return NextResponse.json({ ok: true, ignored: true });
  try {
    const status = await orangePaymentStatus(payToken);
    if (!orangePaymentSucceeded(status)) return NextResponse.json({ ok: true, status: status ?? "PENDING" });
    await collectCompletedOrderPayment({
      orderId: payment.orderId,
      userId: "",
      cashierName: "Orange Money",
    });
  } catch (err) {
    reportError("orange-webhook", err);
  }
  return NextResponse.json({ ok: true });
}
