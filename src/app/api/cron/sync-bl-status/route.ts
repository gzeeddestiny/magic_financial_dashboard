import { NextRequest, NextResponse } from "next/server";
import { syncBLStatusFromIncome } from "@/actions/bl-status";

async function handleSync(request: NextRequest) {
  const secret =
    request.headers.get("x-cron-secret") ||
    request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncBLStatusFromIncome();
  return NextResponse.json({ ok: true, ...result });
}

// GET — Vercel Cron calls this
export async function GET(request: NextRequest) {
  return handleSync(request);
}

// POST — Google Apps Script calls this
export async function POST(request: NextRequest) {
  return handleSync(request);
}
