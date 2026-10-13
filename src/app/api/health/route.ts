import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orangeConfigIssue } from "@/lib/payments/orange-money";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function databaseStatus() {
  if (!process.env.DATABASE_URL) return "missing" as const;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8_000)),
    ]);
    return "ok" as const;
  } catch {
    return "error" as const;
  }
}

export async function GET() {
  const db = await databaseStatus();
  const hasAuth = Boolean(process.env.AUTH_SECRET?.trim());
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  const hasCron = Boolean(process.env.CRON_SECRET?.trim());
  const orange = orangeConfigIssue();
  return NextResponse.json(
    {
      ok: db === "ok" && hasAuth,
      service: "nera-beaute-shop",
      db,
      env: {
        DATABASE_URL: db !== "missing",
        AUTH_SECRET: hasAuth,
        SUPABASE_STORAGE: hasSupabase,
        CRON_SECRET: hasCron,
      },
      // "ok" = encaissement Orange Money automatique ; sinon le code marchand manuel est proposé.
      orangeMoney: orange ?? "ok",
    },
    { status: db === "ok" && hasAuth ? 200 : 503 },
  );
}
