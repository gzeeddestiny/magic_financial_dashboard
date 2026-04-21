"use server";

import { getSheetData } from "@/lib/google/sheets";
import { parseBLRows, deriveBLInstallments, buildStatusMap } from "@/lib/bl-parser";
import { updateInstallmentStatus as updateStatus, markReminderSent } from "@/actions/bl-status";
import { createReminderEvent } from "@/lib/google/calendar";
import { createReminderTask } from "@/lib/google/tasks";
import { sendChatNotification } from "@/lib/google/chat";
import type { Installment } from "@/types";

const REMINDER_EMAILS = [
  "magic.agencyth@gmail.com",
  "tassaphon@gmail.com",
  "kanyapat.contact@gmail.com",
];

export async function getInstallments(): Promise<Installment[]> {
  const [blData, statusData] = await Promise.all([
    getSheetData("BL_Master", "A2:P"),
    getSheetData("BL_Installment_Status", "A2:I").catch(() => [] as string[][]),
  ]);

  const blRows = parseBLRows(blData);
  const statusMap = buildStatusMap(statusData);
  const derived = deriveBLInstallments(blRows, statusMap);

  return derived.map((d) => ({
    invoiceNo: d.blNumber,
    installmentNo: `${d.installmentNo}/${d.totalInstallments}`,
    amountDue: d.amountDue,
    dueDate: d.dueDate.toISOString().split("T")[0],
    status: d.status,
    reminderSent: d.reminderSent,
    blNumber: d.blNumber,
    projectName: d.projectName,
    clientName: d.clientName,
  }));
}

export async function updateInstallmentStatus(
  blNumber: string,
  installmentNo: number,
  status: Installment["status"]
): Promise<void> {
  await updateStatus(blNumber, installmentNo, status);
}

/** Send reminder: Calendar event (email invite) + Google Task + Chat notification */
export async function sendInstallmentReminder(
  blNumber: string,
  installmentNo: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Fetch current installment data
    const installments = await getInstallments();
    const target = installments.find(
      (i) => i.blNumber === blNumber && i.installmentNo === `${installmentNo}/${i.installmentNo.split("/")[1]}`
    ) || installments.find(
      (i) => i.blNumber === blNumber && i.installmentNo.startsWith(`${installmentNo}/`)
    );

    if (!target) {
      return { success: false, message: `ไม่พบ installment ${blNumber} งวด ${installmentNo}` };
    }

    const projectName = target.projectName || "Unknown";

    // 1. Calendar event on due date → sends email invite to attendees automatically
    const { meetLink } = await createReminderEvent(
      target,
      projectName,
      REMINDER_EMAILS
    );

    // 2. Google Task + Chat notification in parallel
    await Promise.all([
      createReminderTask(target, projectName),
      sendChatNotification(target, projectName, meetLink),
    ]);

    // 3. Mark as reminded in Sheet
    await markReminderSent(blNumber, installmentNo);

    return { success: true, message: `ส่งแจ้งเตือนสำเร็จ — ${projectName} งวด ${installmentNo}` };
  } catch (error) {
    console.error("sendInstallmentReminder error:", error);
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}` };
  }
}
