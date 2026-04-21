"use server";

import { getSheetData, appendRow, updateCell, writeSheet } from "@/lib/google/sheets";
import { parseBLRows, buildIncomeByProject, deriveBLInstallments, buildStatusMap, autoMatchWithIncome } from "@/lib/bl-parser";

const TAB = "BL_Installment_Status";

// Schema: A=BL_Number, B=Installment_No, C=Status, D=Reminder_Sent, E=Last_Updated, F=Project_Name, G=Client_Name, H=Due_Date, I=Amount
export interface InstallmentStatusEntry {
  blNumber: string;
  installmentNo: number;
  status: "Pending" | "Paid" | "Overdue";
  reminderSent: boolean;
  lastUpdated: string;
  projectName: string;
}

/** Read all installment statuses from BL_Installment_Status tab.
 *  Returns Map keyed by "BL_NUMBER-INSTALLMENT_NO" */
export async function getInstallmentStatuses(): Promise<
  Map<string, { status: "Pending" | "Paid" | "Overdue"; reminderSent: boolean }>
> {
  let data: string[][];
  try {
    data = await getSheetData(TAB, "A2:I");
  } catch {
    return new Map();
  }

  const map = new Map<string, { status: "Pending" | "Paid" | "Overdue"; reminderSent: boolean }>();

  for (const row of data) {
    const blNumber = (row[0] || "").trim();
    const installmentNo = (row[1] || "").trim();
    const status = (row[2] || "Pending").trim() as "Pending" | "Paid" | "Overdue";
    const reminderSent = (row[3] || "").trim().toUpperCase() === "TRUE";

    if (blNumber && installmentNo) {
      map.set(`${blNumber}-${installmentNo}`, { status, reminderSent });
    }
  }

  return map;
}

/** Update or create installment status entry */
export async function updateInstallmentStatus(
  blNumber: string,
  installmentNo: number,
  status: "Pending" | "Paid" | "Overdue",
  projectName?: string
): Promise<void> {
  const data = await getSheetData(TAB, "A2:F");

  const rowIndex = data.findIndex(
    (row) =>
      (row[0] || "").trim() === blNumber &&
      (row[1] || "").trim() === String(installmentNo)
  );

  const now = new Date().toISOString();

  if (rowIndex >= 0) {
    const rowNumber = rowIndex + 2;
    await updateCell(TAB, `C${rowNumber}`, status);
    await updateCell(TAB, `E${rowNumber}`, now);
    if (projectName) await updateCell(TAB, `F${rowNumber}`, projectName);
  } else {
    await appendRow(TAB, [blNumber, installmentNo, status, "FALSE", now, projectName || ""]);
  }
}

/** Mark reminder as sent for a specific installment */
export async function markReminderSent(
  blNumber: string,
  installmentNo: number
): Promise<void> {
  const data = await getSheetData(TAB, "A2:F");

  const rowIndex = data.findIndex(
    (row) =>
      (row[0] || "").trim() === blNumber &&
      (row[1] || "").trim() === String(installmentNo)
  );

  const now = new Date().toISOString();

  if (rowIndex >= 0) {
    const rowNumber = rowIndex + 2;
    await updateCell(TAB, `D${rowNumber}`, "TRUE");
    await updateCell(TAB, `E${rowNumber}`, now);
  } else {
    await appendRow(TAB, [blNumber, installmentNo, "Pending", "TRUE", now, ""]);
  }
}

/**
 * Sync BL_Installment_Status from Income tab auto-match.
 * Reads BL_Master + Income → derives matched payment status → writes to BL_Installment_Status tab.
 * This makes the Google Sheet itself reflect which BLs have been paid (matching INV records).
 * Call this whenever Income tab is updated.
 */
export async function syncBLStatusFromIncome(): Promise<{
  total: number;
  paid: number;
  overdue: number;
  pending: number;
}> {
  const { getSheetData: fetchSheet } = await import("@/lib/google/sheets");

  const [blRaw, incomeRaw, blStatusRaw] = await Promise.all([
    fetchSheet("BL_Master", "A2:P"),
    fetchSheet("Income", "A2:T"),
    fetchSheet(TAB, "A2:F").catch(() => [] as string[][]),
  ]);

  const blRows = parseBLRows(blRaw);
  const statusMap = buildStatusMap(blStatusRaw);
  const incomeByProject = buildIncomeByProject(incomeRaw);

  // Derive installments with manual overrides first
  const rawInstallments = deriveBLInstallments(blRows, statusMap);
  // Auto-match with income
  const matched = autoMatchWithIncome(rawInstallments, incomeByProject);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build new rows for the sheet
  // Header: BL_Number | Installment_No | Status | Reminder_Sent | Last_Updated | Project_Name | Client_Name | Due_Date | Amount
  const header = ["BL_Number", "Installment_No", "Status", "Reminder_Sent", "Last_Updated", "Project_Name", "Client_Name", "Due_Date", "Amount"];
  const now = new Date().toISOString();

  // Build lookup from old status for reminder_sent preservation
  const reminderMap = new Map<string, "TRUE" | "FALSE">();
  for (const row of blStatusRaw) {
    const key = `${(row[0] || "").trim()}-${(row[1] || "").trim()}`;
    reminderMap.set(key, (row[3] || "FALSE").toUpperCase() === "TRUE" ? "TRUE" : "FALSE");
  }

  const rows: (string | number)[][] = [header];
  let paid = 0, overdue = 0, pending = 0;

  for (const inst of matched) {
    // Determine final status: if auto-matched as Overdue (past due, not income-matched)
    let finalStatus = inst.status;
    if (finalStatus === "Pending") {
      const dueDate = new Date(inst.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) finalStatus = "Overdue";
    }

    const key = `${inst.blNumber}-${inst.installmentNo}`;
    const reminderSent = reminderMap.get(key) || "FALSE";

    rows.push([
      inst.blNumber,
      inst.installmentNo,
      finalStatus,
      reminderSent,
      now,
      inst.projectName,
      inst.clientName,
      inst.dueDate.toISOString().split("T")[0],
      inst.amountDue,
    ]);

    if (finalStatus === "Paid") paid++;
    else if (finalStatus === "Overdue") overdue++;
    else pending++;
  }

  // Write all at once (clear + rewrite)
  await writeSheet(TAB, rows);

  return { total: matched.length, paid, overdue, pending };
}
