"use server";

import { NextRequest, NextResponse } from "next/server";
import { syncBLStatusFromIncome } from "@/actions/bl-status";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncBLStatusFromIncome();
  return NextResponse.json({ ok: true, ...result });
}
