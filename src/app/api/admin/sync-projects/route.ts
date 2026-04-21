"use server";

import { NextRequest, NextResponse } from "next/server";
import { syncProjectsToSheet } from "@/actions/sync-projects";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncProjectsToSheet();
  return NextResponse.json({ ok: true, ...result });
}
