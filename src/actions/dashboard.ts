"use server";

import { getSheetData, batchGet } from "@/lib/google/sheets";
import {
  parseBLRows,
  deriveBLInstallments,
  deriveProjects,
  buildStatusMap,
  buildIncomeByProject,
  autoMatchWithIncome,
  type BLRow,
  type DerivedInstallment,
  type DerivedProject,
} from "@/lib/bl-parser";
import type {
  KpiData,
  MonthlyTrend,
  ProjectProfitability,
  ArAgingBucket,
  CashForecast,
  ExpenseByCategory,
  ExpenseAnomaly,
  NetCashOutlook,
} from "@/types";

// ===== Date Range =====

export interface DateRange {
  from: string; // "YYYY-MM"
  to: string;   // "YYYY-MM"
}

function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01`,
    to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  };
}

/** Detect the actual year range from data — used when no explicit range is provided */
interface DataBoundary {
  min: string; // earliest month key
  max: string; // latest month key
  ytd: DateRange; // YTD of latest year
}

function detectDataBoundary(expenses: string[][], income: string[][]): DataBoundary {
  let minKey = "9999-12";
  let maxKey = "0000-01";

  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date) continue;
    const key = getMonthKey(date);
    if (key < minKey) minKey = key;
    if (key > maxKey) maxKey = key;
  }

  for (const row of income) {
    if (row[17] === "ยกเลิก" || row[17] === "ไม่อนุมัติ") continue;
    const date = parseThaiDate(row[1]);
    if (!date) continue;
    const key = getMonthKey(date);
    if (key < minKey) minKey = key;
    if (key > maxKey) maxKey = key;
  }

  if (minKey === "9999-12") {
    const def = getDefaultDateRange();
    return { min: def.from, max: def.to, ytd: def };
  }

  const latestYear = maxKey.split("-")[0];
  return {
    min: minKey,
    max: maxKey,
    ytd: { from: `${latestYear}-01`, to: maxKey },
  };
}

function isDateInRange(date: Date, range: DateRange): boolean {
  const key = getMonthKey(date);
  return key >= range.from && key <= range.to;
}

// ===== Helpers =====

const EN_MONTHS: Record<string, number> = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

function parseThaiDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  // Handle ISO format: "2026-01-15"
  if (trimmed.includes("-")) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  // Handle Thai format: "15/1/2026" or "15/01/2026" or "1/4/68" (Buddhist Era short)
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    let [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    // Handle Buddhist Era (พ.ศ.) — years > 2400 are likely BE
    if (year > 2400) year -= 543;
    // Handle 2-digit year
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  // Handle English month name: "1 December 25" or "18 January 2026"
  const enMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (enMatch) {
    let day = Number(enMatch[1]);
    const month = EN_MONTHS[enMatch[2].toLowerCase()];
    let year = Number(enMatch[3]);
    if (!month) return null;
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getThaiMonthName(monthKey: string): string {
  const months: Record<string, string> = {
    "01": "ม.ค.", "02": "ก.พ.", "03": "มี.ค.", "04": "เม.ย.",
    "05": "พ.ค.", "06": "มิ.ย.", "07": "ก.ค.", "08": "ส.ค.",
    "09": "ก.ย.", "10": "ต.ค.", "11": "พ.ย.", "12": "ธ.ค.",
  };
  const [year, month] = monthKey.split("-");
  return `${months[month]} ${year.slice(2)}`;
}

function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/,/g, "")) || 0;
}

// ===== Data Fetching =====

async function getAllData() {
  const data = await batchGet([
    "Income!A2:T",
    "Expenses!A2:F",
    "BL_Master!A2:P",
    "BL_Installment_Status!A2:I",
    "Cash_Balance!A2:C",
    "Budget!A2:D",
    "Fixed_Costs!A2:C",
  ]);

  const income = data["Income!A2:T"] || [];
  const expenses = data["Expenses!A2:F"] || [];

  // Parse BL_Master into typed structures
  const blRaw = data["BL_Master!A2:P"] || [];
  const blStatusRaw = data["BL_Installment_Status!A2:I"] || [];
  const blRows = parseBLRows(blRaw);
  const statusMap = buildStatusMap(blStatusRaw);
  // 1. Derive installments with manual status overrides (BL_Installment_Status)
  const rawInstallments = deriveBLInstallments(blRows, statusMap);
  // 2. Auto-match with Income tab — mark Paid if project has income >= installment amount
  const incomeByProject = buildIncomeByProject(income);
  const blInstallments = autoMatchWithIncome(rawInstallments, incomeByProject);
  const blProjects = deriveProjects(blRows);

  return {
    income,
    expenses,
    blRows,
    blInstallments,
    blProjects,
    cashBalance: data["Cash_Balance!A2:C"] || [],
    budget: data["Budget!A2:D"] || [],
    fixedCosts: data["Fixed_Costs!A2:C"] || [],
    boundary: detectDataBoundary(expenses, income),
  };
}

// ===== 1. KPI Data =====

export async function getKpiData(range?: DateRange): Promise<KpiData> {
  const { income, expenses, cashBalance, boundary } = await getAllData();
  const r = range || boundary.ytd;

  // Compute "previous period" range (shift back by the same span)
  const [fromYear, fromMonth] = r.from.split("-").map(Number);
  const [toYear, toMonth] = r.to.split("-").map(Number);
  const spanMonths = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
  const prevFrom = new Date(fromYear, fromMonth - 1 - spanMonths, 1);
  const prevTo = new Date(toYear, toMonth - 1 - spanMonths + (spanMonths - 1), 1);
  const prevRange: DateRange = {
    from: `${prevFrom.getFullYear()}-${String(prevFrom.getMonth() + 1).padStart(2, "0")}`,
    to: `${prevTo.getFullYear()}-${String(prevTo.getMonth() + 1).padStart(2, "0")}`,
  };

  let totalRevenue = 0;
  let totalExpenses = 0;
  let lastMonthRevenue = 0;
  let lastMonthExpenses = 0;

  for (const row of income) {
    if (row[17] === "ยกเลิก" || row[17] === "ไม่อนุมัติ") continue;
    const date = parseThaiDate(row[1]);
    const amount = parseNumber(row[11]);
    if (!date) continue;

    if (isDateInRange(date, r)) totalRevenue += amount;
    if (isDateInRange(date, prevRange)) lastMonthRevenue += amount;
  }

  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    const amount = parseNumber(row[3]);
    if (!date) continue;

    if (isDateInRange(date, r)) totalExpenses += amount;
    if (isDateInRange(date, prevRange)) lastMonthExpenses += amount;
  }

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;
  const lastMonthMargin = lastMonthRevenue > 0
    ? (lastMonthProfit / lastMonthRevenue) * 100
    : 0;

  const cashInBank = cashBalance.length > 0
    ? parseNumber(cashBalance[cashBalance.length - 1][1])
    : 0;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    cashInBank,
    lastMonthMargin,
    lastMonthRevenue,
    lastMonthExpenses,
  };
}

// ===== 2. Monthly Trends (12 months) =====

export async function getMonthlyTrends(range?: DateRange): Promise<MonthlyTrend[]> {
  const { income, expenses, boundary } = await getAllData();
  const r = range || boundary.ytd;

  // Generate month keys for the range (expand to show context: range ± 2 months, min 6 months)
  const [fromYear, fromMonth] = r.from.split("-").map(Number);
  const [toYear, toMonth] = r.to.split("-").map(Number);
  const rangeMonths = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
  const totalMonths = Math.max(rangeMonths + 4, 6);
  const padBefore = Math.floor((totalMonths - rangeMonths) / 2);

  const monthKeys: string[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(fromYear, fromMonth - 1 - padBefore + i, 1);
    monthKeys.push(getMonthKey(d));
  }

  const revenueByMonth: Record<string, number> = {};
  const expenseByMonth: Record<string, number> = {};
  monthKeys.forEach((k) => {
    revenueByMonth[k] = 0;
    expenseByMonth[k] = 0;
  });

  for (const row of income) {
    if (row[17] === "ยกเลิก" || row[17] === "ไม่อนุมัติ") continue;
    const date = parseThaiDate(row[1]);
    if (!date) continue;
    const key = getMonthKey(date);
    if (key in revenueByMonth) {
      revenueByMonth[key] += parseNumber(row[11]);
    }
  }

  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date) continue;
    const key = getMonthKey(date);
    if (key in expenseByMonth) {
      expenseByMonth[key] += parseNumber(row[3]);
    }
  }

  return monthKeys.map((key) => ({
    month: getThaiMonthName(key),
    revenue: revenueByMonth[key],
    expenses: expenseByMonth[key],
    net: revenueByMonth[key] - expenseByMonth[key],
  }));
}

// ===== 3. Project Profitability =====

export async function getProjectProfitability(range?: DateRange): Promise<ProjectProfitability[]> {
  const { income, expenses, blProjects, blInstallments, boundary } = await getAllData();
  const r = range || boundary.ytd;

  // Aggregate revenue per project from Income (filtered by range) — "ยอดเก็บจริง"
  const revenueByProject: Record<string, number> = {};
  const clientByProject: Record<string, string> = {};

  for (const row of income) {
    if (row[17] === "ยกเลิก" || row[17] === "ไม่อนุมัติ") continue;
    const date = parseThaiDate(row[1]); // col B
    if (!date || !isDateInRange(date, r)) continue;

    const projName = row[4] || ""; // col E
    const clientName = row[3] || ""; // col D
    const amount = parseNumber(row[11]); // col L
    if (!projName) continue;

    revenueByProject[projName] = (revenueByProject[projName] || 0) + amount;
    if (!clientByProject[projName]) clientByProject[projName] = clientName;
  }

  // Aggregate costs per project from Expenses (filtered by range)
  const costByProject: Record<string, number> = {};
  for (const row of expenses) {
    const date = parseThaiDate(row[0]); // col A
    if (!date || !isDateInRange(date, r)) continue;

    const projName = row[1] || ""; // col B
    const amount = parseNumber(row[3]); // col D
    if (!projName) continue;

    costByProject[projName] = (costByProject[projName] || 0) + amount;
  }

  // Project metadata from BL_Master (derived)
  const blContractByProject: Record<string, number> = {};
  const typeByProject: Record<string, string> = {};
  const pmByProject: Record<string, string> = {};
  for (const proj of blProjects) {
    blContractByProject[proj.projectName] = proj.totalContractValue;
    typeByProject[proj.projectName] = proj.type;
    pmByProject[proj.projectName] = proj.salesperson;
  }

  // Combine all known projects from BL + Income + Expenses
  const allProjects = new Set([
    ...Object.keys(revenueByProject),
    ...Object.keys(costByProject),
    ...Object.keys(blContractByProject),
  ]);

  // Build projectStatus per project from installments
  // "closed" = all installments Paid, "running" = any Pending/Overdue
  const installmentsByProject = new Map<string, typeof blInstallments>();
  for (const inst of blInstallments) {
    const list = installmentsByProject.get(inst.projectName) || [];
    list.push(inst);
    installmentsByProject.set(inst.projectName, list);
  }

  const result: ProjectProfitability[] = [];
  for (const projName of allProjects) {
    const billedAmount = revenueByProject[projName] || 0;
    const blContractValue = blContractByProject[projName] || 0;
    const directCosts = costByProject[projName] || 0;
    // contractValue = BL contract if available, otherwise billedAmount
    const contractValue = blContractValue || billedAmount;
    const margin = billedAmount - directCosts;
    const marginPercent = billedAmount > 0 ? (margin / billedAmount) * 100 : 0;

    let status: "healthy" | "warning" | "danger" = "healthy";
    if (marginPercent < 0) status = "danger";
    else if (marginPercent < 20) status = "warning";

    const insts = installmentsByProject.get(projName) || [];
    const projectStatus: "running" | "closed" =
      insts.length > 0 && insts.every((i) => i.status === "Paid") ? "closed" : "running";

    result.push({
      projectName: projName,
      clientName: clientByProject[projName] || blProjects.find(p => p.projectName === projName)?.clientName || "",
      projectType: typeByProject[projName] || "",
      projectManager: pmByProject[projName] || "",
      contractValue,
      blContractValue,
      billedAmount,
      directCosts,
      margin,
      marginPercent,
      status,
      projectStatus,
    });
  }

  // Sort by margin descending
  result.sort((a, b) => b.margin - a.margin);
  return result;
}

// ===== 4. A/R Aging =====

export async function getArAging(range?: DateRange): Promise<ArAgingBucket[]> {
  const { blInstallments, boundary } = await getAllData();
  const r = range || boundary.ytd;
  // Use end of the `to` month as reference date for aging
  const [toYear, toMonth] = r.to.split("-").map(Number);
  const now = new Date(toYear, toMonth - 1 + 1, 0); // last day of `to` month
  now.setHours(0, 0, 0, 0);

  const buckets: Record<string, { amount: number; count: number }> = {
    "0-30 วัน": { amount: 0, count: 0 },
    "31-60 วัน": { amount: 0, count: 0 },
    "61-90 วัน": { amount: 0, count: 0 },
    ">90 วัน": { amount: 0, count: 0 },
  };

  for (const inst of blInstallments) {
    if (inst.status === "Paid") continue;

    const dueDate = new Date(inst.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const ageDays = Math.max(0, daysOverdue);

    if (ageDays <= 30) {
      buckets["0-30 วัน"].amount += inst.amountDue;
      buckets["0-30 วัน"].count += 1;
    } else if (ageDays <= 60) {
      buckets["31-60 วัน"].amount += inst.amountDue;
      buckets["31-60 วัน"].count += 1;
    } else if (ageDays <= 90) {
      buckets["61-90 วัน"].amount += inst.amountDue;
      buckets["61-90 วัน"].count += 1;
    } else {
      buckets[">90 วัน"].amount += inst.amountDue;
      buckets[">90 วัน"].count += 1;
    }
  }

  return Object.entries(buckets).map(([bucket, data]) => ({
    bucket,
    amount: data.amount,
    count: data.count,
  }));
}

// ===== 4b. AR Installments (for table view + mark paid) =====

export interface ArInstallmentRow {
  blNumber: string;
  projectName: string;
  clientName: string;
  installmentNo: number;
  totalInstallments: number;
  amountDue: number;
  dueDateISO: string;      // ISO string — safe to pass to client
  status: "Pending" | "Paid" | "Overdue";
  daysOverdue: number;     // negative = not yet due
  autoMatchedPaid: boolean;
  reminderSent: boolean;
}

export async function getArInstallments(): Promise<ArInstallmentRow[]> {
  const { blInstallments } = await getAllData();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return blInstallments
    .map((inst) => {
      const due = new Date(inst.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return {
        blNumber: inst.blNumber,
        projectName: inst.projectName,
        clientName: inst.clientName,
        installmentNo: inst.installmentNo,
        totalInstallments: inst.totalInstallments,
        amountDue: inst.amountDue,
        dueDateISO: inst.dueDate.toISOString(),
        status: inst.status,
        daysOverdue,
        autoMatchedPaid: inst.autoMatchedPaid ?? false,
        reminderSent: inst.reminderSent,
      };
    })
    .sort((a, b) => {
      // Unpaid first, sorted by overdue days desc
      if (a.status === "Paid" && b.status !== "Paid") return 1;
      if (a.status !== "Paid" && b.status === "Paid") return -1;
      return b.daysOverdue - a.daysOverdue;
    });
}



// ===== 5. Cash Forecast (3 months) =====

export async function getCashForecast(range?: DateRange): Promise<CashForecast[]> {
  const { cashBalance, expenses, blInstallments, boundary } = await getAllData();
  const r = range || boundary.ytd;
  // Use end of `to` month as starting point for forecast
  const [toYear, toMonth] = r.to.split("-").map(Number);
  const now = new Date(toYear, toMonth - 1, 1);

  // Current cash
  const currentCash = cashBalance.length > 0
    ? parseNumber(cashBalance[cashBalance.length - 1][1])
    : 0;

  // Monthly burn rate (average last 3 months or all expenses)
  const expenseByMonth: Record<string, number> = {};
  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date) continue;
    const key = getMonthKey(date);
    expenseByMonth[key] = (expenseByMonth[key] || 0) + parseNumber(row[3]);
  }
  const monthlyExpenses = Object.values(expenseByMonth);
  const avgBurnRate = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
    : 0;

  // Expected collections per month from pending BL installments
  const collectionsByMonth: Record<string, number> = {};
  for (const inst of blInstallments) {
    if (inst.status === "Paid") continue;
    const key = getMonthKey(inst.dueDate);
    collectionsByMonth[key] = (collectionsByMonth[key] || 0) + inst.amountDue;
  }

  // Project 3 months forward
  const forecast: CashForecast[] = [];
  let runningCash = currentCash;

  // Add current month as "actual"
  const currentMonthKey = getMonthKey(now);
  forecast.push({
    month: getThaiMonthName(currentMonthKey),
    projected: currentCash,
    actual: currentCash,
  });

  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = getMonthKey(futureDate);
    const expectedCollections = collectionsByMonth[key] || 0;
    runningCash = runningCash + expectedCollections - avgBurnRate;

    forecast.push({
      month: getThaiMonthName(key),
      projected: Math.round(runningCash),
    });
  }

  return forecast;
}

// ===== 6. Expense by Category =====

export async function getExpenseByCategory(range?: DateRange): Promise<ExpenseByCategory[]> {
  const { expenses, boundary } = await getAllData();
  const r = range || boundary.ytd;

  const categoryTotals: Record<string, number> = {};
  let total = 0;

  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date || !isDateInRange(date, r)) continue;

    const category = row[2] || "Other"; // col C
    const amount = parseNumber(row[3]);  // col D
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    total += amount;
  }

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ===== 7. Budget vs Actual =====

export interface BudgetVsActual {
  category: string;
  department: string;
  budget: number;
  actual: number;
  variance: number;
  overBudget: boolean;
}

export async function getBudgetVsActual(range?: DateRange): Promise<BudgetVsActual[]> {
  const { expenses, budget, boundary } = await getAllData();
  const r = range || boundary.ytd;

  // Expenses filtered by range
  const actualByCategory: Record<string, number> = {};
  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date || !isDateInRange(date, r)) continue;

    const category = row[2] || "Other";
    actualByCategory[category] = (actualByCategory[category] || 0) + parseNumber(row[3]);
  }

  return budget.map((row) => {
    const category = row[0] || "";
    const department = row[1] || "";
    const budgetAmt = parseNumber(row[2]);
    const actual = actualByCategory[category] || 0;
    const variance = budgetAmt - actual;

    return {
      category,
      department,
      budget: budgetAmt,
      actual,
      variance,
      overBudget: variance < 0,
    };
  });
}

// ===== 8. Anomaly Detection =====

export async function getRecentAnomalies(range?: DateRange): Promise<ExpenseAnomaly[]> {
  const { expenses, boundary } = await getAllData();
  const r = range || boundary.ytd;

  // Stats are computed from ALL expenses (baseline), anomalies filtered by range
  const categoryData: Record<string, number[]> = {};
  for (const row of expenses) {
    const category = row[2] || "Other";
    const amount = parseNumber(row[3]);
    if (!categoryData[category]) categoryData[category] = [];
    categoryData[category].push(amount);
  }

  const categoryStats: Record<string, { avg: number; std: number }> = {};
  for (const [cat, amounts] of Object.entries(categoryData)) {
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length;
    const std = Math.sqrt(variance);
    categoryStats[cat] = { avg, std };
  }

  // Find anomalies within the date range
  const anomalies: ExpenseAnomaly[] = [];
  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date || !isDateInRange(date, r)) continue;

    const category = row[2] || "Other";
    const amount = parseNumber(row[3]);
    const stats = categoryStats[category];
    if (!stats || stats.std === 0 || stats.avg === 0) continue;

    const threshold = stats.avg + 2 * stats.std;
    if (amount > threshold) {
      const deviation = ((amount - stats.avg) / stats.avg) * 100;
      anomalies.push({
        date: row[0] || "",
        projectName: row[1] || "",
        category,
        amount,
        description: row[4] || "",
        imageUrl: row[5] || "",
        deviation: Math.round(deviation),
      });
    }
  }

  // Sort by deviation descending
  anomalies.sort((a, b) => b.deviation - a.deviation);
  return anomalies.slice(0, 10);
}

// ===== 9. Cash Flow KPIs =====

export interface CashFlowKpis {
  cashInBank: number;
  cashRunway: number;
  monthlyBurnRate: number;
  outstandingAR: number;
}

export async function getCashFlowKpis(range?: DateRange): Promise<CashFlowKpis> {
  const { cashBalance, expenses, blInstallments, boundary } = await getAllData();
  const r = range || boundary.ytd;

  const cashInBank = cashBalance.length > 0
    ? parseNumber(cashBalance[cashBalance.length - 1][1])
    : 0;

  // Burn rate from expenses within range
  const expenseByMonth: Record<string, number> = {};
  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date || !isDateInRange(date, r)) continue;
    const key = getMonthKey(date);
    expenseByMonth[key] = (expenseByMonth[key] || 0) + parseNumber(row[3]);
  }
  const monthlyExpenses = Object.values(expenseByMonth);
  const monthlyBurnRate = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
    : 0;

  // Outstanding A/R from BL installments (all non-paid)
  let outstandingAR = 0;
  for (const inst of blInstallments) {
    if (inst.status === "Paid") continue;
    outstandingAR += inst.amountDue;
  }

  const cashRunway = monthlyBurnRate > 0 ? cashInBank / monthlyBurnRate : 999;

  return { cashInBank, cashRunway, monthlyBurnRate, outstandingAR };
}

// ===== 10. Project Filter Options =====

export interface ProjectFilterOptions {
  types: string[];
  pms: string[];
}

export async function getProjectFilterOptions(): Promise<ProjectFilterOptions> {
  const { blProjects } = await getAllData();

  const types = new Set<string>();
  const pms = new Set<string>();

  for (const proj of blProjects) {
    if (proj.type) types.add(proj.type);
    if (proj.salesperson) pms.add(proj.salesperson);
  }

  return {
    types: Array.from(types).sort(),
    pms: Array.from(pms).sort(),
  };
}

// ===== 11. Full Dashboard Data (single fetch) =====

export interface DashboardData {
  kpi: KpiData;
  trends: MonthlyTrend[];
  projects: ProjectProfitability[];
  arAging: ArAgingBucket[];
  cashForecast: CashForecast[];
  expenseByCategory: ExpenseByCategory[];
  budgetVsActual: BudgetVsActual[];
  anomalies: ExpenseAnomaly[];
}

export async function getDashboardData(range?: DateRange): Promise<DashboardData> {
  const [kpi, trends, projects, arAging, cashForecast, expenseByCategory, budgetVsActual, anomalies] =
    await Promise.all([
      getKpiData(range),
      getMonthlyTrends(range),
      getProjectProfitability(range),
      getArAging(range),
      getCashForecast(range),
      getExpenseByCategory(range),
      getBudgetVsActual(range),
      getRecentAnomalies(range),
    ]);

  return { kpi, trends, projects, arAging, cashForecast, expenseByCategory, budgetVsActual, anomalies };
}

// ===== 12. Smart Default Range =====

export interface PeriodInfo {
  min: string;  // earliest month in data
  max: string;  // latest month in data
  ytd: DateRange;
}

export async function getDataPeriodInfo(): Promise<PeriodInfo> {
  const { boundary } = await getAllData();
  return boundary;
}

// ===== 13. Net Cash Outlook (future 6 months) =====
// Shows expected inflow (pending installments) vs fixed costs per upcoming month

export async function getNetCashOutlook(): Promise<NetCashOutlook[]> {
  const { blInstallments, fixedCosts } = await getAllData();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 6 future months starting from current month
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push(getMonthKey(d));
  }

  // Aggregate pending BL installment inflows per month
  const inflowByMonth: Record<string, number> = {};
  for (const key of months) inflowByMonth[key] = 0;

  for (const inst of blInstallments) {
    if (inst.status === "Paid") continue;
    const key = getMonthKey(inst.dueDate);
    if (key in inflowByMonth) {
      inflowByMonth[key] += inst.amountDue;
    }
  }

  // Aggregate fixed costs per month from Fixed_Costs tab
  // Columns: A=Month(YYYY-MM), B=Category, C=Amount
  // If Month is blank → recurring every month
  const fixedByMonth: Record<string, number> = {};
  for (const key of months) fixedByMonth[key] = 0;

  for (const row of fixedCosts) {
    const monthKey = (row[0] || "").trim();
    const amount = parseNumber(row[2]);
    if (!amount) continue;

    if (!monthKey) {
      // Recurring — apply to all 6 months
      for (const key of months) fixedByMonth[key] += amount;
    } else if (monthKey in fixedByMonth) {
      fixedByMonth[monthKey] += amount;
    }
  }

  return months.map((key) => ({
    month: getThaiMonthName(key),
    monthKey: key,
    inflow: inflowByMonth[key],
    fixedCost: fixedByMonth[key],
    net: inflowByMonth[key] - fixedByMonth[key],
  }));
}

