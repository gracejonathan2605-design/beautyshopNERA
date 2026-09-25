import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { collectCompletedOrderPayment } from "@/services/order.service";

export const dynamic = "force-dynamic";

function secretOk(header: string, secret: string) {
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "Webhook non configuré" }, { status: 503 });
  const header = request.headers.get("x-payment-secret") ?? "";
  if (!secretOk(header, secret)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { orderNumber?: string; status?: string } | null;
  if (!body?.orderNumber || body.status !== "COMPLETED") {
    return NextResponse.json({ ok: false, error: "Payload incomplet" }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where: { number: body.orderNumber },
    select: { id: true, payments: { where: { status: "PENDING" }, select: { id: true } } },
  });
  if (!order?.payments.length) return NextResponse.json({ ok: true, ignored: true });
  await collectCompletedOrderPayment({
    orderId: order.id,
    userId: "",
    cashierName: "Mobile Money",
  }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
