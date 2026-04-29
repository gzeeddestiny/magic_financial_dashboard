// ===== BL_Master Parser =====
// Pure logic module — no I/O. Parses BL_Master sheet data into typed structures.

// ===== Types =====

export interface BLRow {
  sequence: number;
  blNumber: string;
  docType: string;
  date: Date | null;
  clientName: string;
  projectName: string;
  taxId: string;
  dueDate: Date | null;
  office: string;
  baseAmount: number;
  vat: number;
  totalNet: number;
  depositRef: string;
  status: string;
  salesperson: string;
  remarks: string;
}

export interface DerivedInstallment {
  blNumber: string;
  projectName: string;
  clientName: string;
  installmentNo: number;
  totalInstallments: number;
  amountDue: number;
  dueDate: Date;
  status: "Pending" | "Paid" | "Overdue";
  reminderSent: boolean;
  /** True if this installment was auto-matched as Paid from Income tab */
  autoMatchedPaid?: boolean;
}

export interface DerivedProject {
  projectName: string;
  clientName: string;
  salesperson: string;
  totalContractValue: number;
  blCount: number;
  type: string;
}

// ===== Thai Date Parsing =====

const THAI_MONTHS: Record<string, number> = {
  "มกราคม": 0, "กุมภาพันธ์": 1, "มีนาคม": 2, "เมษายน": 3,
  "พฤษภาคม": 4, "มิถุนายน": 5, "กรกฎาคม": 6, "สิงหาคม": 7,
  "กันยายน": 8, "ตุลาคม": 9, "พฤศจิกายน": 10, "ธันวาคม": 11,
};

const THAI_MONTH_PATTERN = Object.keys(THAI_MONTHS).join("|");

/** Parse dd/mm/yyyy Thai date (supports Buddhist Era years > 2400) */
function parseThaiSlashDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // ISO format: "2026-01-15"
  if (trimmed.includes("-")) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // Thai format: "dd/mm/yyyy"
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    let [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (year > 2400) year -= 543; // Buddhist Era
    if (year < 100) year += 2000; // 2-digit year
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** Parse comma-formatted number string like "25,758.34" */
function parseCommaNumber(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/,/g, "")) || 0;
}

// ===== BL Row Parsing =====

const SKIP_STATUSES = new Set(["ยกเลิก", "ไม่อนุมัติ"]);

export function parseBLRows(raw: string[][]): BLRow[] {
  const rows: BLRow[] = [];

  for (const row of raw) {
    const status = (row[13] || "").trim();
    if (SKIP_STATUSES.has(status)) continue;

    const projectName = (row[5] || "").trim();
    if (!projectName) continue; // skip rows without project name

    rows.push({
      sequence: parseInt(row[0]) || 0,
      blNumber: (row[1] || "").trim(),
      docType: (row[2] || "").trim(),
      date: parseThaiSlashDate(row[3] || ""),
      clientName: (row[4] || "").trim(),
      projectName,
      taxId: (row[6] || "").trim(),
      dueDate: parseThaiSlashDate(row[7] || ""),
      office: (row[8] || "").trim(),
      baseAmount: parseCommaNumber(row[9]),
      vat: parseCommaNumber(row[10]),
      totalNet: parseCommaNumber(row[11]),
      depositRef: (row[12] || "").trim(),
      status,
      salesperson: (row[14] || "").trim(),
      remarks: (row[15] || "").trim(),
    });
  }

  return rows;
}

// ===== Installment Parsing from Remarks =====

// Format 1: งวดที่ 1 1 มกราคม 2569 ยอด 26,788.67 บาท
const FORMAT1_REGEX = new RegExp(
  `งวดที่\\s*(\\d+)\\s+(\\d+)\\s+(${THAI_MONTH_PATTERN})\\s+(\\d{4})\\s+ยอด\\s+([\\d,]+(?:\\.\\d+)?)\\s*บาท`,
  "g"
);

// Format 2: ภายในวันที่ DD เดือน YYYY (with optional % and/or ยอด)
// Captures payment lines containing "ภายในวันที่" followed by a Thai date
const FORMAT2_REGEX = new RegExp(
  `(?:งวดที่\\s*(\\d+)\\s+)?[^\\n]*?(\\d+)\\s*%[^\\n]*?(?:ยอด\\s*([\\d,]+(?:\\.\\d+)?))?[^\\n]*?ภายในวันที่\\s*(\\d+)\\s+(${THAI_MONTH_PATTERN})\\s+(\\d{4})`,
  "g"
);

// Format 3: 100% ยอด XX ภายในวันที่ (single payment with amount)
const FORMAT3_REGEX = new RegExp(
  `(\\d+)\\s*%\\s*ยอด\\s*([\\d,]+(?:\\.\\d+)?)\\s*ภายในวันที่\\s*(\\d+)\\s+(${THAI_MONTH_PATTERN})\\s+(\\d{4})`,
  "g"
);

interface RawInstallment {
  installmentNo: number;
  percentage: number;
  amount: number; // 0 = compute from percentage
  dueDate: Date;
}

function parseDateFromParts(day: number, monthName: string, year: number): Date | null {
  if (year > 2400) year -= 543;
  const monthIndex = THAI_MONTHS[monthName];
  if (monthIndex === undefined) return null;
  const d = new Date(year, monthIndex, day);
  return isNaN(d.getTime()) ? null : d;
}

export function parseInstallmentsFromRemarks(
  remarks: string,
  bl: BLRow
): DerivedInstallment[] {
  if (!remarks) return [];

  // Try Format 1 first: งวดที่ X DD เดือน YYYY ยอด XX บาท
  const format1Results: RawInstallment[] = [];
  FORMAT1_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FORMAT1_REGEX.exec(remarks)) !== null) {
    const dueDate = parseDateFromParts(parseInt(match[2]), match[3], parseInt(match[4]));
    if (!dueDate) continue;
    format1Results.push({
      installmentNo: parseInt(match[1]),
      percentage: 0,
      amount: parseCommaNumber(match[5]),
      dueDate,
    });
  }

  if (format1Results.length > 0) {
    return buildInstallments(format1Results, bl);
  }

  // Try Format 2: lines with ภายในวันที่ + percentage
  // Split by lines and parse each payment line
  const lines = remarks.split("\n");
  const lineResults: RawInstallment[] = [];
  let autoNo = 0;

  for (const line of lines) {
    // Skip lines without payment info
    if (!line.includes("ภายในวันที่")) continue;

    // Extract percentage
    const pctMatch = line.match(/(\d+)\s*%/);
    const percentage = pctMatch ? parseInt(pctMatch[1]) : 100;

    // Extract exact amount if present (ยอด XX,XXX.XX or ยอด XX)
    const amtMatch = line.match(/ยอด\s*([\d,]+(?:\.\d+)?)/);
    const amount = amtMatch ? parseCommaNumber(amtMatch[1]) : 0;

    // Extract date: ภายในวันที่ DD เดือน YYYY
    const dateRegex = new RegExp(
      `ภายในวันที่\\s*(\\d+)\\s+(${THAI_MONTH_PATTERN})\\s+(\\d{4})`
    );
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    const dueDate = parseDateFromParts(
      parseInt(dateMatch[1]),
      dateMatch[2],
      parseInt(dateMatch[3])
    );
    if (!dueDate) continue;

    // Extract งวดที่ if present
    const instNoMatch = line.match(/งวดที่\s*(\d+)/);
    autoNo++;
    const installmentNo = instNoMatch ? parseInt(instNoMatch[1]) : autoNo;

    lineResults.push({
      installmentNo,
      percentage,
      amount,
      dueDate,
    });
  }

  if (lineResults.length > 0) {
    // Resolve amounts from percentage if needed
    for (const inst of lineResults) {
      if (inst.amount === 0 && inst.percentage > 0) {
        inst.amount = Math.round((bl.totalNet * inst.percentage) / 100 * 100) / 100;
      }
    }
    return buildInstallments(lineResults, bl);
  }

  return [];
}

function buildInstallments(raw: RawInstallment[], bl: BLRow): DerivedInstallment[] {
  const total = raw.length;
  return raw.map((r) => ({
    blNumber: bl.blNumber,
    projectName: bl.projectName,
    clientName: bl.clientName,
    installmentNo: r.installmentNo,
    totalInstallments: total,
    amountDue: r.amount,
    dueDate: r.dueDate,
    status: "Pending" as const,
    reminderSent: false,
  }));
}

// ===== Status Override Map =====

export type StatusOverride = { status: "Pending" | "Paid" | "Overdue"; reminderSent: boolean; amount?: number };

/** Build status override map from BL_Installment_Status sheet rows.
 *  Columns: A=BL_Number, B=Installment_No, C=Status, D=Reminder_Sent, E=Last_Updated, F=Project_Name, G=Client_Name, H=Due_Date, I=Amount */
export function buildStatusMap(raw: string[][]): Map<string, StatusOverride> {
  const map = new Map<string, StatusOverride>();

  for (const row of raw) {
    const blNumber = (row[0] || "").trim();
    const installmentNo = (row[1] || "").trim();
    const status = (row[2] || "Pending").trim() as StatusOverride["status"];
    const reminderSent = (row[3] || "").trim().toUpperCase() === "TRUE";
    const amount = parseFloat((row[8] || "").replace(/,/g, "")) || undefined;

    if (blNumber && installmentNo) {
      map.set(`${blNumber}-${installmentNo}`, { status, reminderSent, amount });
    }
  }

  return map;
}

// ===== Derive All Installments =====

export function deriveBLInstallments(
  blRows: BLRow[],
  statusOverrides?: Map<string, StatusOverride>
): DerivedInstallment[] {
  const all: DerivedInstallment[] = [];

  for (const bl of blRows) {
    // Try parsing installments from remarks
    const fromRemarks = parseInstallmentsFromRemarks(bl.remarks, bl);

    if (fromRemarks.length > 0) {
      // Multi-installment BL
      all.push(...fromRemarks);
    } else {
      // Single installment = full BL amount on due date
      if (!bl.dueDate) continue; // skip if no due date
      all.push({
        blNumber: bl.blNumber,
        projectName: bl.projectName,
        clientName: bl.clientName,
        installmentNo: 1,
        totalInstallments: 1,
        amountDue: bl.totalNet,
        dueDate: bl.dueDate,
        status: "Pending",
        reminderSent: false,
      });
    }
  }

  // Apply overrides from BL_Installment_Status tab (status, reminderSent, amount)
  if (statusOverrides && statusOverrides.size > 0) {
    for (const inst of all) {
      const key = `${inst.blNumber}-${inst.installmentNo}`;
      const override = statusOverrides.get(key);
      if (override) {
        inst.status = override.status;
        inst.reminderSent = override.reminderSent;
        if (override.amount && override.amount > 0) {
          inst.amountDue = override.amount;
        }
      }
    }
  }

  return all;
}

// ===== Derive Projects =====

export function deriveProjects(blRows: BLRow[]): DerivedProject[] {
  const groups = new Map<string, { bls: BLRow[] }>();

  for (const bl of blRows) {
    const existing = groups.get(bl.projectName);
    if (existing) {
      existing.bls.push(bl);
    } else {
      groups.set(bl.projectName, { bls: [bl] });
    }
  }

  const projects: DerivedProject[] = [];

  for (const [projectName, { bls }] of groups) {
    const first = bls[0];
    const totalContractValue = bls.reduce((sum, bl) => sum + bl.totalNet, 0);
    const blCount = bls.length;

    projects.push({
      projectName,
      clientName: first.clientName,
      salesperson: first.salesperson,
      totalContractValue,
      blCount,
      type: blCount >= 3 ? "Retainer" : "Project-based",
    });
  }

  // Sort by contract value descending
  projects.sort((a, b) => b.totalContractValue - a.totalContractValue);

  return projects;
}

// ===== Auto-Match BL Installments with Income =====

/**
 * Build a map of totalIncome per project from Income tab raw rows.
 * Income columns: B=Date(1), D=ClientName(3), E=ProjectName(4), L=Amount(11)
 */
export function buildIncomeByProject(incomeRaw: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of incomeRaw) {
    if (row[17] === "ยกเลิก" || row[17] === "ไม่อนุมัติ") continue;
    const project = (row[4] || "").trim(); // col E
    const amount = parseCommaNumber(row[11]);  // col L
    if (project && amount > 0) {
      map.set(project, (map.get(project) || 0) + amount);
    }
  }
  return map;
}

/**
 * Auto-match installments as "Paid" based on Income tab data.
 * 
 * Strategy (per project):
 *   1. Sum total income received (from Income tab)
 *   2. Sort installments by due date ascending (oldest first)
 *   3. Greedily mark installments as Paid until income runs out
 *   4. Only override status if BL_Installment_Status hasn't already set it to "Paid"
 *      (manual overrides take priority)
 * 
 * @param installments - derived installments (already has manual status overrides applied)
 * @param incomeByProject - map from buildIncomeByProject()
 */
export function autoMatchWithIncome(
  installments: DerivedInstallment[],
  incomeByProject: Map<string, number>
): DerivedInstallment[] {
  if (incomeByProject.size === 0) return installments;

  // Group installments by project
  const byProject = new Map<string, DerivedInstallment[]>();
  for (const inst of installments) {
    const list = byProject.get(inst.projectName) || [];
    list.push(inst);
    byProject.set(inst.projectName, list);
  }

  const result: DerivedInstallment[] = [];

  for (const [projectName, insts] of byProject) {
    const totalIncome = incomeByProject.get(projectName) || 0;

    if (totalIncome <= 0) {
      // No income received → keep all as-is
      result.push(...insts);
      continue;
    }

    // Sort by due date ascending (pay oldest first)
    const sorted = [...insts].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    let remaining = totalIncome;

    for (const inst of sorted) {
      // Don't override if manually marked Paid already
      if (inst.status === "Paid") {
        remaining -= inst.amountDue; // still deduct from remaining
        result.push(inst);
        continue;
      }

      if (remaining >= inst.amountDue - 0.01) {
        // Income covers this installment → mark Paid
        remaining -= inst.amountDue;
        result.push({ ...inst, status: "Paid", autoMatchedPaid: true });
      } else {
        // Income exhausted → keep original status (Pending/Overdue)
        result.push(inst);
      }
    }
  }

  return result;
}
