import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { releaseExpiredUnpaidOrders } from "@/services/order.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }
  const result = await releaseExpiredUnpaidOrders();
  return NextResponse.json({ ok: true, ...result });
}
