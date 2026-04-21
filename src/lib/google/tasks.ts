import { google } from "googleapis";
import { getAuthClient } from "./auth";
import type { Installment } from "@/types";

function getTasksClient() {
  return google.tasks({ version: "v1", auth: getAuthClient() });
}

async function getOrCreateTaskList(title: string): Promise<string> {
  const tasks = getTasksClient();

  const lists = await tasks.tasklists.list();
  const existing = lists.data.items?.find((l) => l.title === title);

  if (existing) return existing.id!;

  const created = await tasks.tasklists.insert({
    requestBody: { title },
  });

  return created.data.id!;
}

export async function createReminderTask(
  installment: Installment,
  projectName: string
): Promise<string> {
  const tasks = getTasksClient();
  const taskListId = await getOrCreateTaskList("แจ้งเก็บเงิน");

  const dueDate = new Date(installment.dueDate);

  const task = await tasks.tasks.insert({
    tasklist: taskListId,
    requestBody: {
      title: `เก็บเงินงวด ${installment.installmentNo} - ${projectName}`,
      notes: `ยอดเงิน: ${installment.amountDue.toLocaleString()} บาท\nเลขที่ใบแจ้งหนี้: ${installment.invoiceNo}\nกำหนดชำระ: ${installment.dueDate}`,
      due: dueDate.toISOString(),
    },
  });

  return task.data.id!;
}
