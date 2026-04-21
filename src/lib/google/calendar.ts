import { google } from "googleapis";
import { getAuthClient } from "./auth";
import type { Installment } from "@/types";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!;

function getCalendarClient() {
  return google.calendar({ version: "v3", auth: getAuthClient() });
}

export async function createReminderEvent(
  installment: Installment,
  projectName: string,
  _attendeeEmails: string[]
): Promise<{ eventId: string; meetLink: string }> {
  const calendar = getCalendarClient();

  const dueDate = new Date(installment.dueDate);
  const startTime = new Date(dueDate);
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date(dueDate);
  endTime.setHours(9, 30, 0, 0);

  const event = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: `[แจ้งเก็บเงิน] งวด ${installment.installmentNo} — ${projectName}`,
      description: [
        `โปรเจกต์: ${projectName}`,
        `ลูกค้า: ${installment.clientName || "-"}`,
        `เลขที่ BL: ${installment.blNumber || installment.invoiceNo}`,
        `งวดที่: ${installment.installmentNo}`,
        `ยอดเงิน: ฿${installment.amountDue.toLocaleString()}`,
        `วันครบกำหนด: ${installment.dueDate}`,
        ``,
        `กรุณาติดตามการเก็บเงินตามรายละเอียดข้างต้น`,
      ].join("\n"),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Asia/Bangkok",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Asia/Bangkok",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 },
        ],
      },
    },
  });

  return {
    eventId: event.data.id!,
    meetLink: "",
  };
}

