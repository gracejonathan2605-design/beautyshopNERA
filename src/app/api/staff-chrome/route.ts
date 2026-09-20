import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getStaffSession().catch(() => null);
  if (!session) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  return NextResponse.json(
    {
      firstName: session.firstName,
      lastName: session.lastName,
      roleName: session.roleName,
      pos: hasPermission(session, "pos.access"),
      admin: hasPermission(session, "dashboard.view"),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
