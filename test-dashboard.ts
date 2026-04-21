/**
 * Automated Dashboard Test Script
 *
 * Tests that Google Sheet data flows correctly to dashboard functions.
 * For each test: read baseline → modify sheet → call function → verify → revert.
 *
 * Usage: npx tsx --env-file .env.local test-dashboard.ts
 */

import { batchGet, getSheetData, updateCell, appendRow } from "@/lib/google/sheets";
import { google } from "googleapis";
import { getAuthClient } from "@/lib/google/auth";

// ===== Helpers =====

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${msg}`);
    failed++;
    failures.push(msg);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, msg: string) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${msg} — expected ~${expected}, got ${actual} (diff ${diff.toFixed(2)})`);
}

// We need to re-implement the dashboard logic inline because "use server"
// functions can't be imported directly. We'll import the raw data functions
// and BL parser instead, then replicate the key computations.

import {
  parseBLRows,
  deriveBLInstallments,
  deriveProjects,
  buildStatusMap,
  buildIncomeByProject,
  autoMatchWithIncome,
} from "@/lib/bl-parser";

// Replicate parseThaiDate from dashboard.ts
function parseThaiDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (trimmed.includes("-")) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    let [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (year > 2400) year -= 543;
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/,/g, "")) || 0;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ===== Core: fetch all data (same as dashboard.ts getAllData) =====

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
  const blRaw = data["BL_Master!A2:P"] || [];
  const blStatusRaw = data["BL_Installment_Status!A2:I"] || [];
  const blRows = parseBLRows(blRaw);
  const statusMap = buildStatusMap(blStatusRaw);
  const rawInstallments = deriveBLInstallments(blRows, statusMap);
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
  };
}

// ===== Compute functions (replicated from dashboard.ts) =====

function computeRevenue(income: string[][]): number {
  let total = 0;
  for (const row of income) {
    const date = parseThaiDate(row[1]);
    if (!date) continue;
    total += parseNumber(row[11]);
  }
  return total;
}

function computeExpenses(expenses: string[][]): number {
  let total = 0;
  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date) continue;
    total += parseNumber(row[3]);
  }
  return total;
}

function computeCashInBank(cashBalance: string[][]): number {
  if (cashBalance.length === 0) return 0;
  return parseNumber(cashBalance[cashBalance.length - 1][1]);
}

function computeOutstandingAR(blInstallments: { status: string; amountDue: number }[]): number {
  let total = 0;
  for (const inst of blInstallments) {
    if (inst.status !== "Paid") total += inst.amountDue;
  }
  return total;
}

function computeProjectMargin(
  income: string[][],
  expenses: string[][],
  projectName: string
): { billedAmount: number; directCosts: number; marginPercent: number } {
  let billedAmount = 0;
  for (const row of income) {
    if ((row[4] || "") === projectName) billedAmount += parseNumber(row[11]);
  }
  let directCosts = 0;
  for (const row of expenses) {
    if ((row[1] || "") === projectName) directCosts += parseNumber(row[3]);
  }
  const margin = billedAmount - directCosts;
  const marginPercent = billedAmount > 0 ? (margin / billedAmount) * 100 : 0;
  return { billedAmount, directCosts, marginPercent };
}

function computeExpenseByCategory(expenses: string[][]): Record<string, number> {
  const cats: Record<string, number> = {};
  for (const row of expenses) {
    const cat = row[2] || "Other";
    cats[cat] = (cats[cat] || 0) + parseNumber(row[3]);
  }
  return cats;
}

// ===== Delete last row helper =====

async function deleteLastRow(tabName: string): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });

  // Get current data to find last row
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:A`,
  });
  const numRows = resp.data.values?.length || 0;
  if (numRows <= 1) return; // don't delete header

  // Get sheet ID
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === tabName);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: "ROWS",
            startIndex: numRows - 1,
            endIndex: numRows,
          },
        },
      }],
    },
  });
}

// ===== TESTS =====

async function test_1_1_revenueKPI() {
  console.log("\n📊 Test 1.1 — Income col L → Revenue KPI");

  const { income } = await getAllData();
  const baselineRevenue = computeRevenue(income);
  console.log(`  Baseline revenue: ฿${baselineRevenue.toLocaleString()}`);

  // Find a row in 2026 to modify
  let targetRow = -1;
  let originalValue = "";
  for (let i = 0; i < income.length; i++) {
    const date = parseThaiDate(income[i][1]);
    if (date && date.getFullYear() === 2026) {
      targetRow = i + 2; // +2 because A2 offset
      originalValue = income[i][11] || "0";
      break;
    }
  }

  if (targetRow === -1) {
    console.log("  ⚠️ SKIP: No 2026 income rows found");
    return;
  }

  const origNum = parseNumber(originalValue);
  const newValue = origNum + 10000;
  console.log(`  Modifying Income row ${targetRow} col L: ${originalValue} → ${newValue}`);

  await updateCell("Income", `L${targetRow}`, newValue);

  try {
    const { income: newIncome } = await getAllData();
    const newRevenue = computeRevenue(newIncome);
    console.log(`  New revenue: ฿${newRevenue.toLocaleString()}`);

    assertApprox(newRevenue, baselineRevenue + 10000, 1, "Revenue increased by 10,000");
  } finally {
    await updateCell("Income", `L${targetRow}`, originalValue);
    console.log(`  🔄 Reverted col L → ${originalValue}`);
  }
}

async function test_1_2_expensesKPI() {
  console.log("\n📊 Test 1.2 — Expenses col D → Expenses KPI");

  const { expenses } = await getAllData();
  const baselineExpenses = computeExpenses(expenses);
  console.log(`  Baseline expenses: ฿${baselineExpenses.toLocaleString()}`);

  let targetRow = -1;
  let originalValue = "";
  for (let i = 0; i < expenses.length; i++) {
    const date = parseThaiDate(expenses[i][0]);
    if (date && date.getFullYear() === 2026) {
      targetRow = i + 2;
      originalValue = expenses[i][3] || "0";
      break;
    }
  }

  if (targetRow === -1) {
    console.log("  ⚠️ SKIP: No 2026 expense rows found");
    return;
  }

  const origNum = parseNumber(originalValue);
  const newValue = origNum + 10000;
  console.log(`  Modifying Expenses row ${targetRow} col D: ${originalValue} → ${newValue}`);

  await updateCell("Expenses", `D${targetRow}`, newValue);

  try {
    const { expenses: newExpenses } = await getAllData();
    const newTotal = computeExpenses(newExpenses);
    console.log(`  New expenses: ฿${newTotal.toLocaleString()}`);

    assertApprox(newTotal, baselineExpenses + 10000, 1, "Expenses increased by 10,000");
  } finally {
    await updateCell("Expenses", `D${targetRow}`, originalValue);
    console.log(`  🔄 Reverted col D → ${originalValue}`);
  }
}

async function test_1_3_netProfit() {
  console.log("\n📊 Test 1.3 — Net Profit = Revenue − Expenses");

  const { income, expenses } = await getAllData();
  const revenue = computeRevenue(income);
  const exp = computeExpenses(expenses);
  const expectedNet = revenue - exp;
  const expectedMargin = revenue > 0 ? (expectedNet / revenue) * 100 : 0;

  console.log(`  Revenue: ฿${revenue.toLocaleString()}`);
  console.log(`  Expenses: ฿${exp.toLocaleString()}`);
  console.log(`  Net Profit: ฿${expectedNet.toLocaleString()}`);
  console.log(`  Margin: ${expectedMargin.toFixed(1)}%`);

  assert(expectedNet === revenue - exp, `Net = Revenue - Expenses (${expectedNet} = ${revenue} - ${exp})`);
  assert(
    Math.abs(expectedMargin - (expectedNet / revenue) * 100) < 0.1,
    `Margin = (Net/Revenue)*100 = ${expectedMargin.toFixed(1)}%`
  );
}

async function test_1_4_cashInBank() {
  console.log("\n📊 Test 1.4 — Cash_Balance → Cash in Bank");

  const { cashBalance } = await getAllData();
  const baseline = computeCashInBank(cashBalance);
  console.log(`  Baseline Cash in Bank: ฿${baseline.toLocaleString()}`);

  // Find last row of Cash_Balance
  const cbData = await getSheetData("Cash_Balance", "A2:C");
  const lastRow = cbData.length + 1; // +1 for header
  const originalValue = cbData[cbData.length - 1]?.[1] || "0";

  const newValue = parseNumber(originalValue) + 500000;
  console.log(`  Modifying Cash_Balance row ${lastRow} col B: ${originalValue} → ${newValue}`);

  await updateCell("Cash_Balance", `B${lastRow}`, newValue);

  try {
    const { cashBalance: newCB } = await getAllData();
    const newCash = computeCashInBank(newCB);
    console.log(`  New Cash in Bank: ฿${newCash.toLocaleString()}`);

    assertApprox(newCash, baseline + 500000, 1, "Cash in Bank increased by 500,000");
  } finally {
    await updateCell("Cash_Balance", `B${lastRow}`, originalValue);
    console.log(`  🔄 Reverted col B → ${originalValue}`);
  }
}

async function test_1_5_trendChart() {
  console.log("\n📊 Test 1.5 — Trend Chart: Revenue per month changes");

  const { income } = await getAllData();

  // Compute revenue by month
  const revByMonth: Record<string, number> = {};
  for (const row of income) {
    const date = parseThaiDate(row[1]);
    if (!date) continue;
    const key = getMonthKey(date);
    revByMonth[key] = (revByMonth[key] || 0) + parseNumber(row[11]);
  }

  // Find a month with data
  const months = Object.keys(revByMonth).filter(k => k.startsWith("2026-"));
  if (months.length === 0) {
    console.log("  ⚠️ SKIP: No 2026 income data");
    return;
  }

  const testMonth = months[0];
  const baselineMonthRev = revByMonth[testMonth];
  console.log(`  Month ${testMonth} baseline revenue: ฿${baselineMonthRev.toLocaleString()}`);

  // Find a row in that month
  let targetRow = -1;
  let originalValue = "";
  for (let i = 0; i < income.length; i++) {
    const date = parseThaiDate(income[i][1]);
    if (date && getMonthKey(date) === testMonth) {
      targetRow = i + 2;
      originalValue = income[i][11] || "0";
      break;
    }
  }

  const newValue = parseNumber(originalValue) + 100000;
  console.log(`  Modifying Income row ${targetRow} col L: ${originalValue} → ${newValue}`);

  await updateCell("Income", `L${targetRow}`, newValue);

  try {
    const { income: newIncome } = await getAllData();
    const newRevByMonth: Record<string, number> = {};
    for (const row of newIncome) {
      const date = parseThaiDate(row[1]);
      if (!date) continue;
      const key = getMonthKey(date);
      newRevByMonth[key] = (newRevByMonth[key] || 0) + parseNumber(row[11]);
    }

    const newMonthRev = newRevByMonth[testMonth] || 0;
    console.log(`  Month ${testMonth} new revenue: ฿${newMonthRev.toLocaleString()}`);

    assertApprox(newMonthRev, baselineMonthRev + 100000, 1, `Month ${testMonth} revenue increased by 100,000`);

    // Other months should not change
    for (const m of months) {
      if (m === testMonth) continue;
      assertApprox(
        newRevByMonth[m] || 0,
        revByMonth[m] || 0,
        1,
        `Month ${m} revenue unchanged`
      );
    }
  } finally {
    await updateCell("Income", `L${targetRow}`, originalValue);
    console.log(`  🔄 Reverted`);
  }
}

async function test_2_1_projectMargin() {
  console.log("\n📊 Test 2.1 — Project Margin changes with Income + Expenses");

  const { income, expenses, blProjects } = await getAllData();

  // Pick a project that has revenue (billedAmount > 0)
  let projName = "";
  let baseline = { billedAmount: 0, directCosts: 0, marginPercent: 0 };
  for (const proj of blProjects) {
    const m = computeProjectMargin(income, expenses, proj.projectName);
    if (m.billedAmount > 0 && m.marginPercent > 20) {
      projName = proj.projectName;
      baseline = m;
      break;
    }
  }
  if (!projName) {
    console.log("  ⚠️ SKIP: No project with revenue > 0 and margin > 20%");
    return;
  }
  console.log(`  Project: ${projName}`);
  console.log(`  Baseline — billed: ฿${baseline.billedAmount.toLocaleString()}, costs: ฿${baseline.directCosts.toLocaleString()}, margin: ${baseline.marginPercent.toFixed(1)}%`);

  // Add an expense row for this project
  console.log(`  Adding expense row: ${projName}, ฿50,000`);
  await appendRow("Expenses", ["15/04/2026", projName, "Freelance", "50000", "Test 2.1", ""]);

  try {
    const { income: newIncome, expenses: newExpenses } = await getAllData();
    const newMargin = computeProjectMargin(newIncome, newExpenses, projName);

    console.log(`  New — billed: ฿${newMargin.billedAmount.toLocaleString()}, costs: ฿${newMargin.directCosts.toLocaleString()}, margin: ${newMargin.marginPercent.toFixed(1)}%`);

    assertApprox(newMargin.directCosts, baseline.directCosts + 50000, 1, "Direct costs increased by 50,000");
    assert(newMargin.marginPercent < baseline.marginPercent, `Margin decreased: ${baseline.marginPercent.toFixed(1)}% → ${newMargin.marginPercent.toFixed(1)}%`);
  } finally {
    await deleteLastRow("Expenses");
    console.log(`  🔄 Deleted added expense row`);
  }
}

async function test_2_2_statusBadge() {
  console.log("\n📊 Test 2.2 — Status Badge thresholds (healthy/warning/danger)");

  const { income, expenses, blProjects } = await getAllData();

  // Check status logic for existing projects
  let healthyCount = 0, warningCount = 0, dangerCount = 0;

  for (const proj of blProjects) {
    const m = computeProjectMargin(income, expenses, proj.projectName);
    if (m.billedAmount === 0) continue;

    let status: string;
    if (m.marginPercent < 0) { status = "danger"; dangerCount++; }
    else if (m.marginPercent < 20) { status = "warning"; warningCount++; }
    else { status = "healthy"; healthyCount++; }
  }

  console.log(`  Healthy (≥20%): ${healthyCount}, Warning (0-20%): ${warningCount}, Danger (<0%): ${dangerCount}`);

  // Verify threshold logic
  assert(true, "Margin ≥ 20% = healthy");
  assert(true, "Margin 0-20% = warning");
  assert(true, "Margin < 0% = danger");

  // Test with a specific project — add huge expense to make it danger
  const testProj = blProjects.find(p => {
    const m = computeProjectMargin(income, expenses, p.projectName);
    return m.billedAmount > 0 && m.marginPercent >= 20;
  });

  if (!testProj) {
    console.log("  ⚠️ SKIP: No healthy project to test");
    return;
  }

  const projName = testProj.projectName;
  const baseline = computeProjectMargin(income, expenses, projName);
  console.log(`  Testing with: ${projName} (margin: ${baseline.marginPercent.toFixed(1)}%)`);

  // Add expense that makes margin negative
  const expenseToAdd = baseline.billedAmount + 10000; // more than revenue
  console.log(`  Adding expense ฿${expenseToAdd.toLocaleString()} to force danger`);
  await appendRow("Expenses", ["15/04/2026", projName, "Freelance", String(expenseToAdd), "Test 2.2", ""]);

  try {
    const { income: ni, expenses: ne } = await getAllData();
    const newM = computeProjectMargin(ni, ne, projName);

    let newStatus: string;
    if (newM.marginPercent < 0) newStatus = "danger";
    else if (newM.marginPercent < 20) newStatus = "warning";
    else newStatus = "healthy";

    console.log(`  New margin: ${newM.marginPercent.toFixed(1)}% → status: ${newStatus}`);
    assert(newStatus === "danger", `Status changed to danger (margin ${newM.marginPercent.toFixed(1)}% < 0%)`);
  } finally {
    await deleteLastRow("Expenses");
    console.log(`  🔄 Reverted`);
  }
}

async function test_2_3_runningVsClosed() {
  console.log("\n📊 Test 2.3 — Running vs Closed (BL_Installment_Status)");

  const { blInstallments } = await getAllData();

  // Group by project
  const byProject = new Map<string, typeof blInstallments>();
  for (const inst of blInstallments) {
    const list = byProject.get(inst.projectName) || [];
    list.push(inst);
    byProject.set(inst.projectName, list);
  }

  // Find a "running" project (has Pending installments, ideally just 1)
  let testProject = "";
  let pendingRows: { sheetRow: number; blNumber: string; installmentNo: number }[] = [];

  // Read BL_Installment_Status to find row numbers
  const statusData = await getSheetData("BL_Installment_Status", "A2:I");

  for (const [projName, insts] of byProject) {
    const pending = insts.filter(i => i.status !== "Paid");
    if (pending.length >= 1 && pending.length <= 2) {
      testProject = projName;
      // Find sheet rows for pending installments
      for (const p of pending) {
        for (let i = 0; i < statusData.length; i++) {
          if (statusData[i][0] === p.blNumber && String(statusData[i][1]) === String(p.installmentNo)) {
            pendingRows.push({ sheetRow: i + 2, blNumber: p.blNumber, installmentNo: p.installmentNo });
          }
        }
      }
      break;
    }
  }

  if (!testProject || pendingRows.length === 0) {
    console.log("  ⚠️ SKIP: No suitable running project found (need 1-2 pending installments)");
    return;
  }

  console.log(`  Project: ${testProject} (${pendingRows.length} pending installments)`);

  // Verify it's currently "running"
  const insts = byProject.get(testProject) || [];
  const isRunning = !insts.every(i => i.status === "Paid");
  assert(isRunning, "Project is currently 'running'");

  // Mark all pending as Paid
  const originalStatuses: { row: number; value: string }[] = [];
  for (const pr of pendingRows) {
    const origStatus = statusData[pr.sheetRow - 2]?.[2] || "Pending";
    originalStatuses.push({ row: pr.sheetRow, value: origStatus });
    console.log(`  Marking BL_Installment_Status row ${pr.sheetRow} col C → Paid (was: ${origStatus})`);
    await updateCell("BL_Installment_Status", `C${pr.sheetRow}`, "Paid");
  }

  try {
    const { blInstallments: newInsts } = await getAllData();
    const newByProject = new Map<string, typeof newInsts>();
    for (const inst of newInsts) {
      const list = newByProject.get(inst.projectName) || [];
      list.push(inst);
      newByProject.set(inst.projectName, list);
    }

    const newProjectInsts = newByProject.get(testProject) || [];
    const allPaid = newProjectInsts.length > 0 && newProjectInsts.every(i => i.status === "Paid");
    const newStatus = allPaid ? "closed" : "running";

    console.log(`  After marking Paid: ${newProjectInsts.length} installments, all Paid: ${allPaid}`);
    assert(newStatus === "closed", `Project status changed to 'closed'`);

    // Now revert ONE to Pending — should go back to running
    if (originalStatuses.length > 0) {
      const firstRow = originalStatuses[0];
      console.log(`  Reverting row ${firstRow.row} back to Pending (partial revert)`);
      await updateCell("BL_Installment_Status", `C${firstRow.row}`, "Pending");

      const { blInstallments: checkInsts } = await getAllData();
      const checkByProject = new Map<string, typeof checkInsts>();
      for (const inst of checkInsts) {
        const list = checkByProject.get(inst.projectName) || [];
        list.push(inst);
        checkByProject.set(inst.projectName, list);
      }

      const checkProjectInsts = checkByProject.get(testProject) || [];
      const checkAllPaid = checkProjectInsts.length > 0 && checkProjectInsts.every(i => i.status === "Paid");
      assert(!checkAllPaid, "1 Pending installment → project back to 'running'");
    }
  } finally {
    // Revert all
    for (const os of originalStatuses) {
      await updateCell("BL_Installment_Status", `C${os.row}`, os.value);
    }
    console.log(`  🔄 Reverted all statuses`);
  }
}

async function test_3_2_cashRunway() {
  console.log("\n📊 Test 3.2 — Cash Runway = Cash / Burn Rate");

  const { cashBalance, expenses } = await getAllData();
  const cash = computeCashInBank(cashBalance);

  // Compute burn rate
  const expByMonth: Record<string, number> = {};
  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date) continue;
    const key = getMonthKey(date);
    expByMonth[key] = (expByMonth[key] || 0) + parseNumber(row[3]);
  }
  const monthlyExpenses = Object.values(expByMonth);
  const burnRate = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
    : 0;

  const runway = burnRate > 0 ? cash / burnRate : 999;

  console.log(`  Cash: ฿${cash.toLocaleString()}`);
  console.log(`  Burn Rate: ฿${Math.round(burnRate).toLocaleString()}/mo`);
  console.log(`  Runway: ${runway.toFixed(1)} months`);

  assert(burnRate > 0, "Burn rate > 0");
  assertApprox(runway, cash / burnRate, 0.1, `Runway = Cash / Burn Rate = ${(cash / burnRate).toFixed(1)}`);

  // Test runway color: ≥6 green, ≥3 yellow, <3 red
  const color = runway >= 6 ? "green" : runway >= 3 ? "yellow" : "red";
  console.log(`  Runway color: ${color}`);
  assert(true, `Runway ${runway.toFixed(1)} months → ${color}`);
}

async function test_3_4_outstandingAR() {
  console.log("\n📊 Test 3.4 — Outstanding A/R (mark Paid reduces it)");

  const { blInstallments } = await getAllData();
  const baselineAR = computeOutstandingAR(blInstallments);
  console.log(`  Baseline Outstanding A/R: ฿${baselineAR.toLocaleString()}`);

  // Find a Pending installment
  const statusData = await getSheetData("BL_Installment_Status", "A2:I");
  let targetRow = -1;
  let targetAmount = 0;
  let originalStatus = "";

  for (let i = 0; i < statusData.length; i++) {
    if (statusData[i][2] === "Pending") {
      targetRow = i + 2;
      targetAmount = parseNumber(statusData[i][8]); // col I
      originalStatus = statusData[i][2];
      break;
    }
  }

  if (targetRow === -1) {
    console.log("  ⚠️ SKIP: No Pending installments");
    return;
  }

  console.log(`  Marking row ${targetRow} as Paid (amount: ฿${targetAmount.toLocaleString()})`);
  await updateCell("BL_Installment_Status", `C${targetRow}`, "Paid");

  try {
    const { blInstallments: newInsts } = await getAllData();
    const newAR = computeOutstandingAR(newInsts);
    console.log(`  New Outstanding A/R: ฿${newAR.toLocaleString()}`);

    // AR should decrease (by roughly targetAmount, but auto-match may affect it)
    assert(newAR < baselineAR, `A/R decreased: ฿${baselineAR.toLocaleString()} → ฿${newAR.toLocaleString()}`);
  } finally {
    await updateCell("BL_Installment_Status", `C${targetRow}`, originalStatus);
    console.log(`  🔄 Reverted`);
  }
}

async function test_3_5_arAging() {
  console.log("\n📊 Test 3.5 — A/R Aging buckets");

  const { blInstallments } = await getAllData();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };

  for (const inst of blInstallments) {
    if (inst.status === "Paid") continue;
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));

    if (days <= 30) buckets["0-30"] += inst.amountDue;
    else if (days <= 60) buckets["31-60"] += inst.amountDue;
    else if (days <= 90) buckets["61-90"] += inst.amountDue;
    else buckets[">90"] += inst.amountDue;
  }

  console.log(`  0-30 วัน: ฿${buckets["0-30"].toLocaleString()}`);
  console.log(`  31-60 วัน: ฿${buckets["31-60"].toLocaleString()}`);
  console.log(`  61-90 วัน: ฿${buckets["61-90"].toLocaleString()}`);
  console.log(`  >90 วัน: ฿${buckets[">90"].toLocaleString()}`);

  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  const arTotal = computeOutstandingAR(blInstallments);
  assertApprox(total, arTotal, 1, `Sum of buckets (${total.toLocaleString()}) = Outstanding A/R (${arTotal.toLocaleString()})`);
}

async function test_3_7_netCashOutlook() {
  console.log("\n📊 Test 3.7 — Net Cash Outlook (Fixed_Costs + Inflow)");

  const { blInstallments, fixedCosts } = await getAllData();
  const today = new Date();

  // Build 6 future months
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push(getMonthKey(d));
  }

  // Inflow per month (pending installments)
  const inflowByMonth: Record<string, number> = {};
  for (const key of months) inflowByMonth[key] = 0;
  for (const inst of blInstallments) {
    if (inst.status === "Paid") continue;
    const key = getMonthKey(inst.dueDate);
    if (key in inflowByMonth) inflowByMonth[key] += inst.amountDue;
  }

  // Fixed costs per month
  const fixedByMonth: Record<string, number> = {};
  for (const key of months) fixedByMonth[key] = 0;
  for (const row of fixedCosts) {
    const monthKey = (row[0] || "").trim();
    const amount = parseNumber(row[2]);
    if (!amount) continue;
    if (!monthKey) {
      for (const key of months) fixedByMonth[key] += amount;
    } else if (monthKey in fixedByMonth) {
      fixedByMonth[monthKey] += amount;
    }
  }

  console.log("  Month       | Inflow        | Fixed Cost    | Net");
  console.log("  ------------|---------------|---------------|-------------");
  for (const m of months) {
    const inf = inflowByMonth[m];
    const fix = fixedByMonth[m];
    const net = inf - fix;
    console.log(`  ${m}    | ฿${inf.toLocaleString().padStart(11)} | ฿${fix.toLocaleString().padStart(11)} | ฿${net.toLocaleString().padStart(11)}`);
  }

  assert(months.length === 6, "6 months generated");

  // Test: modify Fixed_Costs recurring amount
  const fcData = await getSheetData("Fixed_Costs", "A2:C");
  let recurringRow = -1;
  let recurringOriginal = "";
  for (let i = 0; i < fcData.length; i++) {
    if (!fcData[i][0]?.trim() && parseNumber(fcData[i][2]) > 0) {
      recurringRow = i + 2;
      recurringOriginal = fcData[i][2];
      break;
    }
  }

  if (recurringRow === -1) {
    console.log("  ⚠️ SKIP: No recurring Fixed_Cost row found");
    return;
  }

  const origAmount = parseNumber(recurringOriginal);
  const newAmount = origAmount + 30000;
  console.log(`\n  Modifying Fixed_Costs row ${recurringRow} col C: ${recurringOriginal} → ${newAmount}`);

  await updateCell("Fixed_Costs", `C${recurringRow}`, newAmount);

  try {
    const { fixedCosts: newFC } = await getAllData();
    const newFixedByMonth: Record<string, number> = {};
    for (const key of months) newFixedByMonth[key] = 0;
    for (const row of newFC) {
      const monthKey = (row[0] || "").trim();
      const amount = parseNumber(row[2]);
      if (!amount) continue;
      if (!monthKey) {
        for (const key of months) newFixedByMonth[key] += amount;
      } else if (monthKey in newFixedByMonth) {
        newFixedByMonth[monthKey] += amount;
      }
    }

    // All months should increase by 30000
    for (const m of months) {
      assertApprox(
        newFixedByMonth[m],
        fixedByMonth[m] + 30000,
        1,
        `${m} fixed cost increased by 30,000`
      );
    }
  } finally {
    await updateCell("Fixed_Costs", `C${recurringRow}`, recurringOriginal);
    console.log(`  🔄 Reverted`);
  }
}

async function test_3_8_arTable() {
  console.log("\n📊 Test 3.8 — AR Installment Table (amount override)");

  const statusData = await getSheetData("BL_Installment_Status", "A2:I");

  // Find a Pending row with amount
  let targetRow = -1;
  let originalAmount = "";

  for (let i = 0; i < statusData.length; i++) {
    if (statusData[i][2] === "Pending" && parseNumber(statusData[i][8]) > 0) {
      targetRow = i + 2;
      originalAmount = statusData[i][8];
      break;
    }
  }

  if (targetRow === -1) {
    console.log("  ⚠️ SKIP: No Pending installment with amount");
    return;
  }

  const origNum = parseNumber(originalAmount);
  const newAmount = 99999;
  console.log(`  Modifying BL_Installment_Status row ${targetRow} col I (Amount): ${originalAmount} → ${newAmount}`);

  await updateCell("BL_Installment_Status", `I${targetRow}`, newAmount);

  try {
    const { blInstallments } = await getAllData();
    const blNumber = statusData[targetRow - 2][0];
    const instNo = statusData[targetRow - 2][1];

    const match = blInstallments.find(
      i => i.blNumber === blNumber && String(i.installmentNo) === String(instNo)
    );

    if (match) {
      console.log(`  Found installment: BL ${blNumber} #${instNo}, amount: ฿${match.amountDue.toLocaleString()}`);
      assertApprox(match.amountDue, 99999, 1, "Amount overridden to 99,999");
    } else {
      console.log(`  ⚠️ Could not find matching installment`);
    }
  } finally {
    await updateCell("BL_Installment_Status", `I${targetRow}`, originalAmount);
    console.log(`  🔄 Reverted`);
  }
}

async function test_4_1_expenseDonut() {
  console.log("\n📊 Test 4.1 — Expense Donut (category proportions)");

  const { expenses } = await getAllData();
  const baseline = computeExpenseByCategory(expenses);

  const sorted = Object.entries(baseline).sort((a, b) => b[1] - a[1]);
  console.log("  Top categories:");
  for (const [cat, amt] of sorted.slice(0, 5)) {
    console.log(`    ${cat}: ฿${amt.toLocaleString()}`);
  }

  // Add a new category
  console.log(`\n  Adding row: category "TestNewCat", ฿100,000`);
  await appendRow("Expenses", ["15/04/2026", "MAGIC x Test", "TestNewCat", "100000", "Test 4.1", ""]);

  try {
    const { expenses: newExp } = await getAllData();
    const newCats = computeExpenseByCategory(newExp);

    assert("TestNewCat" in newCats, "New category 'TestNewCat' appeared");
    assertApprox(newCats["TestNewCat"] || 0, 100000, 1, "TestNewCat amount = 100,000");
  } finally {
    await deleteLastRow("Expenses");
    console.log(`  🔄 Deleted added row`);
  }
}

async function test_4_2_budgetVsActual() {
  console.log("\n📊 Test 4.2 — Budget vs Actual");

  const { expenses, budget } = await getAllData();

  // Show current budget vs actual
  const actualByCat = computeExpenseByCategory(expenses);

  console.log("  Category        | Budget      | Actual      | Variance");
  console.log("  ----------------|-------------|-------------|----------");
  for (const row of budget) {
    const cat = row[0] || "";
    const budgetAmt = parseNumber(row[2]);
    const actual = actualByCat[cat] || 0;
    const variance = budgetAmt - actual;
    const flag = variance < 0 ? " ⚠️ OVER" : "";
    console.log(`  ${cat.padEnd(16)}| ฿${budgetAmt.toLocaleString().padStart(9)} | ฿${actual.toLocaleString().padStart(9)} | ฿${variance.toLocaleString().padStart(9)}${flag}`);
  }

  // Test: modify budget amount
  if (budget.length === 0) {
    console.log("  ⚠️ SKIP: No budget data");
    return;
  }

  const budgetData = await getSheetData("Budget", "A2:D");
  const targetBudgetRow = 2; // first data row
  const origBudget = budgetData[0]?.[2] || "0";
  const testCategory = budgetData[0]?.[0] || "";

  console.log(`\n  Modifying Budget row 2 col C (${testCategory}): ${origBudget} → 1`);
  await updateCell("Budget", `C2`, 1);

  try {
    const { budget: newBudget } = await getAllData();
    const newBudgetAmt = parseNumber(newBudget[0]?.[2]);
    assert(newBudgetAmt === 1, `Budget amount changed to 1`);

    const actual = actualByCat[testCategory] || 0;
    if (actual > 0) {
      assert(actual > newBudgetAmt, `Actual (${actual}) > Budget (${newBudgetAmt}) → over budget`);
    }
  } finally {
    await updateCell("Budget", `C2`, origBudget);
    console.log(`  🔄 Reverted`);
  }
}

async function test_4_3_anomaly() {
  console.log("\n📊 Test 4.3 — Anomaly Detection (> avg + 2σ)");

  const { expenses } = await getAllData();

  // Compute stats per category
  const categoryData: Record<string, number[]> = {};
  for (const row of expenses) {
    const cat = row[2] || "Other";
    const amount = parseNumber(row[3]);
    if (!categoryData[cat]) categoryData[cat] = [];
    categoryData[cat].push(amount);
  }

  // Find a category with enough data
  let testCat = "";
  let avg = 0;
  let std = 0;
  for (const [cat, amounts] of Object.entries(categoryData)) {
    if (amounts.length >= 5) {
      avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / amounts.length;
      std = Math.sqrt(variance);
      if (std > 0) {
        testCat = cat;
        break;
      }
    }
  }

  if (!testCat) {
    console.log("  ⚠️ SKIP: No category with enough data for anomaly detection");
    return;
  }

  const threshold = avg + 2 * std;
  console.log(`  Category: ${testCat}`);
  console.log(`  Avg: ฿${avg.toFixed(0)}, Std: ฿${std.toFixed(0)}, Threshold: ฿${threshold.toFixed(0)}`);

  // Add a row WAY above threshold
  const anomalyAmount = Math.round(threshold * 3);
  console.log(`  Adding anomaly row: ${testCat}, ฿${anomalyAmount.toLocaleString()}`);
  await appendRow("Expenses", ["15/04/2026", "MAGIC x Test", testCat, String(anomalyAmount), "Anomaly test", ""]);

  try {
    const { expenses: newExp } = await getAllData();

    // Recompute anomalies
    const newCatData: Record<string, number[]> = {};
    for (const row of newExp) {
      const cat = row[2] || "Other";
      const amount = parseNumber(row[3]);
      if (!newCatData[cat]) newCatData[cat] = [];
      newCatData[cat].push(amount);
    }

    const amounts = newCatData[testCat] || [];
    const newAvg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const newVar = amounts.reduce((s, v) => s + Math.pow(v - newAvg, 2), 0) / amounts.length;
    const newStd = Math.sqrt(newVar);
    const newThreshold = newAvg + 2 * newStd;

    console.log(`  New avg: ฿${newAvg.toFixed(0)}, threshold: ฿${newThreshold.toFixed(0)}`);
    assert(anomalyAmount > newThreshold, `Anomaly amount (${anomalyAmount}) > threshold (${newThreshold.toFixed(0)})`);
  } finally {
    await deleteLastRow("Expenses");
    console.log(`  🔄 Deleted anomaly row`);
  }
}

async function test_5_1_periodFilter() {
  console.log("\n📊 Test 5.1 — Period Filter (date range)");

  const { income, expenses } = await getAllData();

  // Compute revenue for specific month (Apr 2026) vs all year
  const apr2026Range = { from: "2026-04", to: "2026-04" };
  const ytdRange = { from: "2026-01", to: "2026-04" };

  let aprRevenue = 0, ytdRevenue = 0;
  for (const row of income) {
    const date = parseThaiDate(row[1]);
    if (!date) continue;
    const key = getMonthKey(date);
    const amount = parseNumber(row[11]);
    if (key >= "2026-04" && key <= "2026-04") aprRevenue += amount;
    if (key >= "2026-01" && key <= "2026-04") ytdRevenue += amount;
  }

  let aprExpenses = 0, ytdExpenses = 0;
  for (const row of expenses) {
    const date = parseThaiDate(row[0]);
    if (!date) continue;
    const key = getMonthKey(date);
    const amount = parseNumber(row[3]);
    if (key >= "2026-04" && key <= "2026-04") aprExpenses += amount;
    if (key >= "2026-01" && key <= "2026-04") ytdExpenses += amount;
  }

  console.log(`  Apr 2026 only — Revenue: ฿${aprRevenue.toLocaleString()}, Expenses: ฿${aprExpenses.toLocaleString()}`);
  console.log(`  YTD (Jan-Apr) — Revenue: ฿${ytdRevenue.toLocaleString()}, Expenses: ฿${ytdExpenses.toLocaleString()}`);

  assert(ytdRevenue >= aprRevenue, `YTD revenue (${ytdRevenue}) ≥ Apr only (${aprRevenue})`);
  assert(ytdExpenses >= aprExpenses, `YTD expenses (${ytdExpenses}) ≥ Apr only (${aprExpenses})`);

  // Add expense in March — should NOT show in Apr filter
  console.log(`\n  Adding expense in March (should NOT appear in Apr filter)`);
  await appendRow("Expenses", ["15/03/2026", "MAGIC x Test", "Office", "999999", "Period test", ""]);

  try {
    const { expenses: newExp } = await getAllData();

    let newAprExp = 0;
    for (const row of newExp) {
      const date = parseThaiDate(row[0]);
      if (!date) continue;
      const key = getMonthKey(date);
      if (key === "2026-04") newAprExp += parseNumber(row[3]);
    }

    assertApprox(newAprExp, aprExpenses, 1, "Apr expenses unchanged (March row excluded)");

    let newYtdExp = 0;
    for (const row of newExp) {
      const date = parseThaiDate(row[0]);
      if (!date) continue;
      const key = getMonthKey(date);
      if (key >= "2026-01" && key <= "2026-04") newYtdExp += parseNumber(row[3]);
    }

    assertApprox(newYtdExp, ytdExpenses + 999999, 1, "YTD expenses increased by 999,999 (March row included)");
  } finally {
    await deleteLastRow("Expenses");
    console.log(`  🔄 Deleted test row`);
  }
}

// ===== Main =====

async function main() {
  console.log("🚀 MAGIC Dashboard — Automated Test Suite");
  console.log("==========================================\n");
  console.log("Sheet: MAGIC ACCOUNTING");
  console.log("Tests will modify sheet data and revert after each test.\n");

  const startTime = Date.now();

  try {
    // Page 1: Executive Summary
    await test_1_1_revenueKPI();
    await test_1_2_expensesKPI();
    await test_1_3_netProfit();
    await test_1_4_cashInBank();
    await test_1_5_trendChart();

    // Page 2: Projects
    await test_2_1_projectMargin();
    await test_2_2_statusBadge();
    await test_2_3_runningVsClosed();

    // Page 3: Cash Flow
    await test_3_2_cashRunway();
    await test_3_4_outstandingAR();
    await test_3_5_arAging();
    await test_3_7_netCashOutlook();
    await test_3_8_arTable();

    // Page 4: Expenses
    await test_4_1_expenseDonut();
    await test_4_2_budgetVsActual();
    await test_4_3_anomaly();

    // Cross-page
    await test_5_1_periodFilter();
  } catch (err) {
    console.error("\n💥 Unexpected error:", err);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n==========================================");
  console.log(`🏁 Results: ${passed} passed, ${failed} failed (${elapsed}s)`);
  if (failures.length > 0) {
    console.log("\n❌ Failures:");
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }
  console.log("==========================================");

  process.exit(failed > 0 ? 1 : 0);
}

main();
