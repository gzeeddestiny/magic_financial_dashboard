import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "@/lib/google/sheets";
import { parseBLRows, deriveBLInstallments, buildStatusMap } from "@/lib/bl-parser";
import { markReminderSent } from "@/actions/bl-status";
import { createReminderEvent } from "@/lib/google/calendar";
import { createReminderTask } from "@/lib/google/tasks";
import { sendChatNotification } from "@/lib/google/chat";
import type { Installment } from "@/types";

const REMINDER_DAYS_AHEAD = 1;
const ATTENDEE_EMAILS = process.env.REMINDER_EMAILS?.split(",") || [];

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch BL_Master and installment statuses
    const [blData, statusData] = await Promise.all([
      getSheetData("BL_Master", "A2:P"),
      getSheetData("BL_Installment_Status", "A2:I").catch(() => [] as string[][]),
    ]);

    const blRows = parseBLRows(blData);
    const statusMap = buildStatusMap(statusData);
    const installments = deriveBLInstallments(blRows, statusMap);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + REMINDER_DAYS_AHEAD);

    let remindersCreated = 0;

    for (const inst of installments) {
      // Skip paid or already reminded
      if (inst.status !== "Pending" || inst.reminderSent) continue;

      const dueDate = new Date(inst.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Only remind for installments due within the next 3 days
      if (dueDate < today || dueDate > futureDate) continue;

      // Convert DerivedInstallment to Installment for existing calendar/tasks/chat functions
      const installment: Installment = {
        invoiceNo: inst.blNumber,
        installmentNo: `${inst.installmentNo}/${inst.totalInstallments}`,
        amountDue: inst.amountDue,
        dueDate: inst.dueDate.toISOString().split("T")[0],
        status: inst.status,
        reminderSent: inst.reminderSent,
        blNumber: inst.blNumber,
        projectName: inst.projectName,
        clientName: inst.clientName,
      };

      // Project name is already available from BL data
      const projectName = inst.projectName || "Unknown";

      // Create Calendar event first (need Meet link for Chat)
      const { meetLink } = await createReminderEvent(
        installment,
        projectName,
        ATTENDEE_EMAILS
      );

      // Create Task and send Chat notification in parallel
      await Promise.all([
        createReminderTask(installment, projectName),
        sendChatNotification(installment, projectName, meetLink),
      ]);

      // Mark reminder as sent in BL_Installment_Status tab
      await markReminderSent(inst.blNumber, inst.installmentNo);

      remindersCreated++;
    }

    return NextResponse.json({
      success: true,
      remindersCreated,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}
