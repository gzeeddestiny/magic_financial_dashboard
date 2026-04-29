/**
 * test-status-filter.ts
 *
 * Unit tests for "ยกเลิก" / "ไม่อนุมัติ" status filtering.
 * Uses mock data only — no Google Sheets connection required.
 *
 * Usage: npx tsx test-status-filter.ts
 */

import { parseBLRows, buildIncomeByProject } from "@/lib/bl-parser";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

// ─── Mock helpers ──────────────────────────────────────────────────────────────

/** Build a minimal BL_Master row (A-P, 16 columns). */
function blRow(overrides: Partial<Record<number, string>> = {}): string[] {
  const row = [
    "1",           // A=0 ลำดับที่
    "BL001",       // B=1 เลขที่เอกสาร
    "BL",          // C=2 ประเภทเอกสาร
    "01/01/2026",  // D=3 วันที่
    "บริษัท A",    // E=4 ชื่อลูกค้า
    "Project Alpha",// F=5 ชื่อโปรเจกต์
    "1234567890123",// G=6 เลขผู้เสียภาษี
    "31/01/2026",  // H=7 ครบกำหนด
    "สำนักงานใหญ่",// I=8
    "100000",      // J=9 มูลค่า
    "7000",        // K=10 ภาษี
    "107000",      // L=11 ยอดรวม
    "",            // M=12
    "เปิดบิลแล้ว", // N=13 สถานะ ← key field
    "พนักงาน",     // O=14
    "",            // P=15 หมายเหตุ
  ];
  for (const [idx, val] of Object.entries(overrides)) {
    if (val !== undefined) row[Number(idx)] = val;
  }
  return row;
}

/** Build a minimal Income row (A-T, 20 columns). */
function incomeRow(project: string, amount: string, status: string): string[] {
  const row = Array(20).fill("");
  row[1]  = "15/01/2026"; // วันที่ (col B)
  row[4]  = project;       // ชื่อโปรเจกต์ (col E)
  row[11] = amount;        // มูลค่า (col L)
  row[17] = status;        // สถานะ (col R)
  return row;
}

// ─── BL_Master tests ───────────────────────────────────────────────────────────

console.log("\n📋 BL_Master — parseBLRows() status filter");

{
  const rows = [
    blRow({ 1: "BL001", 5: "Project Active",    13: "เปิดบิลแล้ว" }),
    blRow({ 1: "BL002", 5: "Project Cancelled", 13: "ยกเลิก" }),
    blRow({ 1: "BL003", 5: "Project Rejected",  13: "ไม่อนุมัติ" }),
    blRow({ 1: "BL004", 5: "Project Waiting",   13: "รอวางบิล" }),
    blRow({ 1: "BL005", 5: "Project Billed",    13: "วางบิลแล้ว" }),
  ];

  const parsed = parseBLRows(rows);
  const blNumbers = parsed.map((b) => b.blNumber);

  assert(blNumbers.includes("BL001"), "เปิดบิลแล้ว → ผ่าน");
  assert(!blNumbers.includes("BL002"), "ยกเลิก → ถูกกรองออก");
  assert(!blNumbers.includes("BL003"), "ไม่อนุมัติ → ถูกกรองออก");
  assert(blNumbers.includes("BL004"), "รอวางบิล → ผ่าน");
  assert(blNumbers.includes("BL005"), "วางบิลแล้ว → ผ่าน");
  assert(parsed.length === 3, `จำนวน BL ที่เหลือ = 3 (got ${parsed.length})`);
}

// ─── Income tests ─────────────────────────────────────────────────────────────

console.log("\n💰 Income — buildIncomeByProject() status filter");

{
  const rows = [
    incomeRow("Alpha",  "50000", "อนุมัติแล้ว"),
    incomeRow("Alpha",  "30000", "ยกเลิก"),
    incomeRow("Beta",   "20000", "ไม่อนุมัติ"),
    incomeRow("Gamma",  "40000", "อนุมัติแล้ว"),
    incomeRow("Gamma",  "10000", "ยกเลิก"),
  ];

  const map = buildIncomeByProject(rows);

  assert(map.get("Alpha") === 50000,
    `Alpha = 50,000 (ตัด cancelled 30,000 ออก) — got ${map.get("Alpha")}`);
  assert(!map.has("Beta"),
    "Beta ไม่ควรอยู่ใน map (ไม่อนุมัติ)");
  assert(map.get("Gamma") === 40000,
    `Gamma = 40,000 (ตัด cancelled 10,000 ออก) — got ${map.get("Gamma")}`);
  assert(map.size === 2,
    `map size = 2 (got ${map.size})`);
}

// ─── Expense upload dropdown filter (pure logic) ───────────────────────────────

console.log("\n📋 Expense Upload — project dropdown filter (BL_Master F2:N)");

{
  // Simulates what expenses/upload/page.tsx does after fetching F2:N
  // row[0] = col F (project name), row[8] = col N (status)
  const data: string[][] = [
    ["Project Active",    "", "", "", "", "", "", "", "เปิดบิลแล้ว"],
    ["Project Cancelled", "", "", "", "", "", "", "", "ยกเลิก"],
    ["Project Rejected",  "", "", "", "", "", "", "", "ไม่อนุมัติ"],
    ["Project Waiting",   "", "", "", "", "", "", "", "รอวางบิล"],
    ["Project Active",    "", "", "", "", "", "", "", "วางบิลแล้ว"], // duplicate name → deduped
  ];

  const projects = [
    ...new Set(
      data
        .filter((row) => !["ยกเลิก", "ไม่อนุมัติ"].includes((row[8] || "").trim()))
        .map((row) => row[0])
        .filter(Boolean)
    ),
  ].sort();

  assert(!projects.includes("Project Cancelled"), "ยกเลิก → ไม่อยู่ใน dropdown");
  assert(!projects.includes("Project Rejected"),  "ไม่อนุมัติ → ไม่อยู่ใน dropdown");
  assert(projects.includes("Project Active"),     "เปิดบิลแล้ว → อยู่ใน dropdown");
  assert(projects.includes("Project Waiting"),    "รอวางบิล → อยู่ใน dropdown");
  assert(projects.length === 2, `dropdown มี 2 projects (got ${projects.length})`);
}

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n🏁 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
