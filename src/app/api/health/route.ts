import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasAuth = Boolean(process.env.AUTH_SECRET);
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return NextResponse.json({
    ok: hasDb && hasAuth,
    service: "nera-beaute-shop",
    env: {
      DATABASE_URL: hasDb,
      AUTH_SECRET: hasAuth,
      NEXT_PUBLIC_SUPABASE_URL: hasSupabase,
    },
  });
}
