# MAGIC Financial Dashboard — Progress Tracker

> ไฟล์นี้สำหรับ AI ตัวอื่น (Claude Code, Cursor, etc.) อ่านเพื่อทำงานต่อ
> อัพเดตล่าสุด: 2026-04-21 (Bangkok) — Local dev setup + Expenses dropdown validation

---

## 🎯 เป้าหมายของโปรเจกต์

สร้าง **Financial Dashboard** สำหรับ Marketing Agency ให้ CEO/CFO ดูสถานะการเงินแบบ real-time ผ่าน Web App โดยใช้ **Google Sheets เป็น Database**, **Gemini AI อ่านสลิป**, และแสดงผลบน **Next.js Dashboard**

อ่าน `PROJECT_SPEC.md` สำหรับ spec ละเอียดทั้งหมด

---

## ✅ สิ่งที่เสร็จแล้ว (ทำงานได้จริง)

### Infrastructure & Backend
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| Google Sheets API | `src/lib/google/sheets.ts` | CRUD: `getSheetData`, `batchGet`, `appendRow`, `updateCell`, `updateRow`, `writeSheet` |
| Google Drive Upload | `src/lib/google/drive.ts` | อัพโหลดรูปสลิป แยกโฟลเดอร์ตามวัน |
| Google Calendar | `src/lib/google/calendar.ts` | สร้าง event แจ้งเตือน + Meet link |
| Google Tasks | `src/lib/google/tasks.ts` | สร้าง task เก็บเงิน |
| Google Chat Webhook | `src/lib/google/chat.ts` | ส่ง Card V2 แจ้งเตือนเก็บเงินผ่าน Chat Space |
| AI OCR (Gemini) | `src/lib/ai/ocr.ts` | อ่านสลิป → สกัดวันที่/จำนวนเงิน/หมวดหมู่ |
| OCR API Route | `src/app/api/ocr/route.ts` | POST endpoint สำหรับ OCR |
| Submit Expense | `src/actions/expenses.ts` | อัพโหลดรูป + append ลง Sheet |
| BL Parser | `src/lib/bl-parser.ts` | แกะ BL_Master → BLRow, DerivedInstallment, DerivedProject |
| BL Status Tracking | `src/actions/bl-status.ts` | Read/write BL_Installment_Status tab (Pending/Paid/Overdue per installment) |
| Installments | `src/actions/installments.ts` | จัดการงวดชำระ (ใช้ BL parser แทน Invoice_Installments) |
| Sync Projects | `src/actions/sync-projects.ts` | สร้าง Projects tab จาก BL_Master อัตโนมัติ |
| Cron Reminders | `src/app/api/cron/reminders/route.ts` | เตือนเก็บเงินอัตโนมัติ 1 วันก่อน due date (Calendar + Tasks + Google Chat) |
| Auth (NextAuth) | `src/app/api/auth/[...nextauth]/route.ts` | Google OAuth login |
| Auth Proxy | `src/proxy.ts` | ป้องกันหน้า Dashboard (Next.js 16 proxy, ไม่มี dev bypass) |
| Types | `src/types/index.ts` | TypeScript interfaces ทั้งหมด |
| Format Helpers | `src/lib/format.ts` | `formatCurrency()`, `formatPercent()`, `formatCompact()` |

### Dashboard Data Layer
| Function | ไฟล์ `src/actions/dashboard.ts` | return type |
|----------|------|-------------|
| `getKpiData()` | Revenue, Expenses, Net Profit, Margin, Cash, MoM comparison | `KpiData` |
| `getMonthlyTrends()` | 12 เดือนย้อนหลัง | `MonthlyTrend[]` |
| `getProjectProfitability()` | Revenue vs Cost per project | `ProjectProfitability[]` |
| `getArAging()` | หนี้แบ่งตาม 0-30, 31-60, 61-90, >90 วัน | `ArAgingBucket[]` |
| `getCashForecast()` | คาดการณ์เงินสด 3 เดือน | `CashForecast[]` |
| `getExpenseByCategory()` | สัดส่วนรายจ่ายตามหมวดหมู่ | `ExpenseByCategory[]` |
| `getBudgetVsActual()` | งบประมาณ vs ใช้จริง | `BudgetVsActual[]` |
| `getRecentAnomalies()` | รายจ่ายผิดปกติ (>2σ) | `ExpenseAnomaly[]` |
| `getCashFlowKpis()` | Cash, Runway, Burn Rate, Outstanding A/R | `CashFlowKpis` |
| `getArInstallments()` | รายการ installment ทั้งหมด (สำหรับ AR Table) | `ArInstallmentRow[]` |
| `getDashboardData()` | รวมทุกอย่างใน 1 call | `DashboardData` |

### Dashboard UI (4 Pages + 9 Charts)
| Page | URL | Components |
|------|-----|-----------|
| **Executive Summary** | `/executive` | 4 KPI cards + Revenue/Expense Trend + Top/Bottom 5 Projects |
| **Project Profitability** | `/projects` | Status badges + Margin Bar Chart + Sortable Table + Type/PM filter |
| **Cash Flow** | `/cashflow` | 4 KPI cards + A/R Aging Chart + Cash Forecast Chart + Net Cash Outlook + **AR Table** |
| **Expense Deep Dive** | `/expenses` | Donut Chart + Budget vs Actual + Anomaly Table |
| **Upload Slip** | `/expenses/upload` | AI OCR form → submit to Sheet + Drive |

| Chart Component | File | Type |
|----------------|------|------|
| Revenue vs Expense Trend | `charts/revenue-expense-trend.tsx` | ComposedChart (Bar สุทธิ + Area รายรับ/รายจ่าย) |
| Project Ranking | `charts/project-ranking.tsx` | Card list (Top/Bottom 5) |
| Project Margin | `charts/project-margin.tsx` | Horizontal BarChart |
| Project Table | `charts/project-table.tsx` | Sortable Table |
| A/R Aging | `charts/ar-aging.tsx` | BarChart (color-coded) |
| Cash Forecast | `charts/cash-forecast.tsx` | AreaChart + gradient |
| Net Cash Outlook | `charts/net-cash-outlook.tsx` | ComposedChart (inflow vs fixed cost) |
| Expense Donut | `charts/expense-donut.tsx` | PieChart donut + legend |
| Budget vs Actual | `charts/budget-actual.tsx` | Grouped BarChart |
| Anomaly Table | `charts/anomaly-table.tsx` | Alert Table |
| **AR Installment Table** | `components/dashboard/ar-installment-table.tsx` | Table: BL/งวด, สถานะ, overdue days + ปุ่ม "แจ้งทีม" (กดได้หลายรอบ) |

### Google Sheet (Database)
- **Spreadsheet:** MAGIC ACCOUNTING (`1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI`)
- **Active tabs:**
  - `Income` (A-T) — รายรับจาก FlowAccount จริง (20 columns) — ใช้ col L (มูลค่า) เป็น revenue
  - `Expenses` (A-F) — รายจ่าย (107 rows, rebuilt Jan–Apr 2026 ยึดตามโปรเจกต์ BL_Master)
  - `BL_Master` (A-P) — ใบวางบิล/Billing (50 rows, 37 projects) ← **ใช้แทน Projects_Master + Invoice_Installments**
  - `BL_Installment_Status` (A-I) — track สถานะจ่ายรายงวด (9 columns: BL_Number, Installment_No, Status, Reminder_Sent, Last_Updated, Project_Name, Client_Name, Due_Date, Amount)
  - `Cash_Balance` (A-C) — ยอดเงินสดรายเดือน
  - `Budget` (A-D) — งบประมาณตามหมวดหมู่
  - `Fixed_Costs` — ค่าใช้จ่ายคงที่
  - `Projects` — derived tab จาก BL_Master (สร้างอัตโนมัติด้วย `syncProjectsToSheet()`)
  - `QT_Master` (A-M) — ใบเสนอราคา (Quotation) 13 columns: ลำดับที่, เลขที่เอกสาร, วัน/เดือน/ปี, ชื่อลูกค้า, ชื่อโปรเจ็ค, เลขผู้เสียภาษี, สำนักงานใหญ่/สาขา, มูลค่า, ภาษีมูลค่าเพิ่ม, ยอดรวมสุทธิ, เอกสารอ้างอิงในระบบ, เลขที่อ้างอิง, สถานะ
  - `Project_Master` — derived tab จาก QT_Master (QUERY formula อัตโนมัติ, ตัดซ้ำ + ตัดสถานะ "ไม่อนุมัติ" ออก) — ใช้เป็น dropdown สำหรับ Expenses + P&L per project
- **Legacy tabs (ไม่ใช้แล้ว):** ~~Projects_Master~~, ~~Invoice_Installments~~ → แทนที่ด้วย BL_Master
- **Seeder script:** `fix-sheets.mjs` (run `node fix-sheets.mjs` to re-seed Income/Expenses/Budget)

### Data Freshness & Period Picker (2026-04-02)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| Force-dynamic rendering | `src/app/(dashboard)/layout.tsx` | `export const dynamic = "force-dynamic"` — ไม่ cache หน้า Dashboard |
| Smart data boundary detection | `src/actions/dashboard.ts` | `detectDataBoundary()` สแกนวันที่จริงจาก Sheet → กำหนด min/max/YTD อัตโนมัติ |
| Period picker (ช่วงเวลา) | `src/components/layout/period-picker.tsx` | Presets: เดือนนี้/ปีนี้/ปีก่อน/ทั้งหมด + Month grid picker + Prev/Next |
| `getDataPeriodInfo()` action | `src/actions/dashboard.ts` | Server action ส่ง min/max/ytd ให้ period picker |
| URL-based period state | Search params `?from=YYYY-MM&to=YYYY-MM` | ทุก page อ่าน period จาก URL |
| Thai date parser upgrade | `src/actions/dashboard.ts` | รองรับ พ.ศ., 2-digit year, validation |
| Executive chart redesign | `charts/revenue-expense-trend.tsx` | สุทธิ=Bar (ม่วง), รายรับ=Area (เขียว), รายจ่าย=Area (แดง) + interactive legend + summary pills |
| Data audit — all 6 tabs | `src/actions/dashboard.ts` | ตรวจ column index, case sensitivity, null safety ทุก function |
| Debug API (ชั่วคราว) | `src/app/api/debug-sheets/route.ts` | ดูข้อมูล Sheet real-time (ต้องลบก่อน production) |

### BL_Master Migration (2026-04-08)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| BL Parser (core logic) | `src/lib/bl-parser.ts` | แปลง BL_Master → typed data, แกะงวดจ่ายจากหมายเหตุ (Thai months, พ.ศ.) |
| Status tracking per installment | `src/actions/bl-status.ts` | Read/write tab `BL_Installment_Status` (Pending/Paid/Overdue + Reminder Sent) |
| Dashboard data migration | `src/actions/dashboard.ts` | `getAllData()` เปลี่ยนจาก Projects_Master+Invoice_Installments → BL_Master+BL_Installment_Status |
| Installment rewrite | `src/actions/installments.ts` | Full rewrite ใช้ BL parser |
| Cron reminders migration | `src/app/api/cron/reminders/route.ts` | ใช้ BL-derived installments + project name จาก BL โดยตรง |
| Sync Projects tab | `src/actions/sync-projects.ts` | Server action สร้าง Projects tab ใน Sheet จาก BL_Master |
| writeSheet() utility | `src/lib/google/sheets.ts` | Bulk write/clear+write ทั้ง tab |
| Upload form project dropdown | `src/app/(dashboard)/expenses/upload/page.tsx` | ดึง project names จาก BL_Master col F |
| Revenue dual-source | `src/actions/dashboard.ts` | `blContractValue` (BL ยอดที่ควรได้) + `billedAmount` (Income ยอดเก็บจริง) เทียบกัน |
| Type auto-detection | `src/lib/bl-parser.ts` | ≥3 BLs = "Retainer", น้อยกว่า = "Project-based" |
| BL-Income auto-match | `src/lib/bl-parser.ts` | `buildIncomeByProject()` + `autoMatchWithIncome()` — match BL installments กับ Income tab, mark Paid ถ้า Income ≥ installment amount |
| syncBLStatusFromIncome() | `src/actions/bl-status.ts` | Sync BL_Installment_Status tab จาก Income auto-match (เขียน 9 columns A-I กลับลง Sheet) |
| Cron sync-bl-status | `src/app/api/cron/sync-bl-status/route.ts` + `vercel.json` | GET/POST, รัน `syncBLStatusFromIncome()` ทุก 5 นาที |
| Admin sync-projects API | `src/app/api/admin/sync-projects/route.ts` | POST endpoint สร้าง Projects tab จาก BL_Master (ใช้ x-cron-secret) |
| Admin sync-bl-status API | `src/app/api/admin/sync-bl-status/route.ts` | POST endpoint manual trigger sync BL_Installment_Status |
| AR Installment Table + Alert | `src/components/dashboard/ar-installment-table.tsx` | Table ใน cashflow page — แสดง BL/งวด/ยอด/ครบกำหนด/สถานะ + ปุ่ม "แจ้งทีม" กดส่ง Calendar+Task+Chat |
| getArInstallments() | `src/actions/dashboard.ts` | Server action ส่ง installment list (sorted: overdue ก่อน) ไปยัง AR Table |

#### BL_Master Schema (A-P, 16 columns)
| Col | Index | Name | ตัวอย่าง |
|-----|-------|------|--------|
| A | 0 | ลำดับที่ | 1 |
| B | 1 | เลขที่เอกสาร | BL2026030014 |
| C | 2 | ประเภทเอกสาร | BL |
| D | 3 | วัน/เดือน/ปี | 01/03/2026 (dd/mm/yyyy) |
| E | 4 | ชื่อลูกค้า | บริษัท พัฒนศิลป์... |
| F | 5 | ชื่อโปรเจ็ค | MAGIC x Patnasilp Jan-June 2026 |
| G | 6 | เลขผู้เสียภาษี | 105527010204 |
| H | 7 | ครบกำหนด | 31/03/2026 |
| I | 8 | สำนักงานใหญ่/สาขา | สำนักงานใหญ่ |
| J | 9 | มูลค่า | 25,758.34 |
| K | 10 | ภาษีมูลค่าเพิ่ม | 1,803.08 |
| L | 11 | ยอดรวมสุทธิ | 27,561.42 |
| M | 12 | เอกสารอ้างอิงรับมัดจำ | |
| N | 13 | สถานะ | เปิดบิลแล้ว / รอวางบิล / วางบิลแล้ว / ยกเลิก |
| O | 14 | พนักงานขาย | Kanyapat Ketnoi |
| P | 15 | หมายเหตุ | (free text, อาจมีงวดจ่าย) |

#### BL Status Mapping
- **ทุกสถานะ (ยกเว้น "ยกเลิก") = ยังไม่จ่าย** — BL ไม่มีสถานะ "จ่ายแล้ว"
- Track การจ่ายใน tab `BL_Installment_Status` (A=BL_Number, B=Installment_No, C=Status, D=Reminder_Sent, E=Last_Updated, F=Project_Name, G=Client_Name, H=Due_Date, I=Amount)
- สถานะ: `เปิดบิลแล้ว` (31), `วางบิลแล้ว` (9), `รอวางบิล` (9), `ยกเลิก` (1 — skip)
- **Auto-sync:** Vercel Cron ทุก 5 นาที (`/api/cron/sync-bl-status`) + Google Apps Script onEdit trigger สำหรับ production

#### Installment Parsing จากหมายเหตุ (col P)
- รองรับ 3 formats:
  - **Format 1:** `งวดที่ 1 1 มกราคม 2569 ยอด 26,788.67 บาท`
  - **Format 2:** `X% ภายในวันที่ DD เดือน YYYY` (คำนวณจาก totalNet * percentage / 100)
  - **Format 3:** `X% ยอด XX ภายในวันที่ DD เดือน YYYY`
- รองรับ: Thai month names (มกราคม-ธันวาคม), Buddhist Era (ปี >2400 → -543)
- ถ้าไม่มีงวดในหมายเหตุ → 1 งวด = ยอดรวมสุทธิ (col L) ครบกำหนด (col H)
- ปัจจุบัน parse ได้ 57 installments (จาก 50 BL rows, ไม่นับยกเลิก)
- **Amount override:** col I ใน BL_Installment_Status สามารถ override parsed amount จาก BL_Master ได้

#### Projects with Multiple BLs
- 1 project อาจมีหลาย BL (เช่น billing รายเดือน)
- Patnasilp: 3 BLs, Eunova/Zoflora/Oilatum: 3 BLs → auto-tagged "Retainer"
- 37 unique projects (ไม่นับยกเลิก) จาก 50 BL rows

### BL Installment Sync & Parser Improvements (2026-04-09)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| Multi-format installment parser | `src/lib/bl-parser.ts` | รองรับ 3 formats แทน 1 → parse ได้ 57 installments (เพิ่มจาก 53) |
| BL_Installment_Status 9 columns | `src/actions/bl-status.ts` | เพิ่ม Client_Name, Due_Date, Amount (A-I) |
| Amount override จาก Sheet | `src/lib/bl-parser.ts` | col I ใน BL_Installment_Status override parsed amount |
| Auto-sync cron endpoint | `src/app/api/cron/sync-bl-status/route.ts` | GET+POST, ใช้ `syncBLStatusFromIncome()`, auth ด้วย x-cron-secret |
| Vercel Cron schedule | `vercel.json` | `*/5 * * * *` สำหรับ sync-bl-status |
| Admin sync endpoint | `src/app/api/admin/sync-bl-status/route.ts` | POST endpoint สำหรับ manual sync |
| Dashboard range update | `src/actions/dashboard.ts` | A2:E → A2:I สำหรับ BL_Installment_Status |
| Dev auth bypass | `src/proxy.ts` | re-add dev bypass (NODE_ENV=development → skip auth) |
| Google Apps Script snippet | (docs) | onEdit trigger code สำหรับ real-time sync ใน production |

### Income Tab Restructure — Real FlowAccount Data (2026-04-12)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| Income column mapping อัพเดตทั้งระบบ | `src/actions/dashboard.ts` | เปลี่ยน date จาก `row[2]` → `row[1]` (col B), amount จาก `row[9]` → `row[11]` (col L มูลค่า) — ทุก 4 loops: detectDataBoundary, getKpiData, getMonthlyTrends, getProjectProfitability |
| Income range ขยาย | `src/actions/dashboard.ts`, `src/actions/bl-status.ts` | `A2:O` → `A2:T` (20 columns จาก FlowAccount) |
| bl-parser Income amount | `src/lib/bl-parser.ts` | `buildIncomeByProject()`: `row[9]` → `row[11]` (col L มูลค่า = pre-VAT value) |
| Expenses mock data rebuild | Google Sheets | ✅ วางแล้ว 107 rows (Jan–Apr 2026) ยึดตามชื่อโปรเจกต์จาก BL_Master 27 projects — Freelance/Media/Travel/Food/Payroll/Office/Software |

#### Income Tab Schema (A-T, 20 columns — FlowAccount)
| Col | Index | Name |
|-----|-------|------|
| A | 0 | ลำดับที่ |
| B | 1 | วัน/เดือน/ปี ← date |
| C | 2 | เลขที่เอกสาร |
| D | 3 | ชื่อลูกค้า |
| E | 4 | ชื่อโปรเจ็ค |
| F | 5 | เลขผู้เสียภาษี |
| G | 6 | สำนักงานใหญ่/สาขา |
| H | 7 | ขายแยกภาษี |
| I | 8 | ขายรวมภาษี |
| J | 9 | ส่วนลดก่อน VAT |
| K | 10 | ส่วนลดตามเอกสาร |
| L | 11 | มูลค่า ← **revenue amount ที่ใช้** |
| M | 12 | ภาษีมูลค่าเพิ่ม |
| N | 13 | ยอดรวมสุทธิ |
| O | 14 | เอกสารอ้างอิงในระบบ |
| P | 15 | เลขที่อ้างอิง |
| Q | 16 | เอกสารอ้างอิงรับมัดจำ |
| R | 17 | สถานะ |
| S | 18 | พนักงานขาย |
| T | 19 | หมายเหตุ |

### Installment Alert System (2026-04-10)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| sendInstallmentReminder() | `src/actions/installments.ts` | Server action: กดปุ่ม → สร้าง Calendar event (due date) + Google Task + Chat notification |
| Reminder button in AR table | `src/components/dashboard/ar-installment-table.tsx` | ปุ่ม "แจ้งทีม" ทุก row ที่ยังไม่ Paid — กดได้หลายรอบ แสดง "แจ้งแล้ว X ครั้ง" |
| Calendar event (no attendees) | `src/lib/google/calendar.ts` | ลบ attendees ออก (Service Account ไม่มี Domain-Wide Delegation) — สร้าง event บน shared calendar ตาม due date แทน |
| ลบ createImmediateReminderEvent() | `src/lib/google/calendar.ts` | ไม่ใช้แล้ว — เปลี่ยนเป็น event ตาม due date |
| reminderSent in ArInstallmentRow | `src/actions/dashboard.ts` | เพิ่ม `reminderSent: boolean` ใน type + map จาก BL installments |
| Auto-reminder cron (1 day before) | `src/app/api/cron/reminders/route.ts` | เปลี่ยนจาก 3 วันก่อน → **1 วันก่อน due date** — รัน 08:00 เวลาไทยทุกวัน |
| Enable Google Tasks API | Google Cloud Console | ต้องเปิด Tasks API ใน project 1045469244294 ก่อนใช้งาน |

#### Reminder Recipients (hardcoded)
- `magic.agencyth@gmail.com`
- `tassaphon@gmail.com`
- `kanyapat.contact@gmail.com`

#### Alert Flow
1. กดปุ่ม "แจ้งทีม" → `sendInstallmentReminder(blNumber, installmentNo)`
2. สร้าง Calendar event วัน due date (09:00-09:30) บน shared calendar
3. สร้าง Google Task ใน tasklist "แจ้งเก็บเงิน"
4. ส่ง Chat notification (Card V2) ผ่าน Webhook
5. Mark `Reminder_Sent=TRUE` ใน BL_Installment_Status Sheet
6. Toast แจ้งผลสำเร็จ/ล้มเหลว
7. **กดซ้ำได้** — แสดง "แจ้งแล้ว X ครั้ง" ใต้ปุ่ม

#### Auto Reminder (Cron)
- Vercel Cron รันทุกวัน 01:00 UTC (08:00 เวลาไทย)
- เช็ค installments ที่ due date = **พรุ่งนี้** + ยังไม่เคย remind
- สร้าง Calendar + Task + Chat อัตโนมัติ

### Projects Page — Running vs Closed Split (2026-04-20)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| `projectStatus` field ใน type | `src/types/index.ts` | เพิ่ม `projectStatus: "running" \| "closed"` ใน `ProjectProfitability` interface |
| คำนวณ projectStatus | `src/actions/dashboard.ts` | `getProjectProfitability()` build `installmentsByProject` map → `closed` ถ้า installments ทุกงวด Paid, ไม่งั้น `running` |
| แยกตารางบน Projects page | `src/components/dashboard/projects-view.tsx` | แบ่งเป็น 2 section: "กำลังดำเนินงาน" (chart + table) และ "ปิดแล้ว" (table เท่านั้น) — ลบ projectStatus filter dropdown ออก |
| ลบ badge "สถานะโปรเจกต์" ออกจากตาราง | `src/components/charts/project-table.tsx` | ไม่จำเป็นแล้ว เพราะแยก section ชัดเจนแล้ว |

#### Running vs Closed Logic
- **running** = มี installments ที่ยังไม่ Paid (หรือไม่มี installments เลย)
- **closed** = installments ทุกงวด Paid แล้ว (ลูกค้าจ่ายครบ)
- Running section: แสดง health pills (ปกติ/เฝ้าระวัง/ขาดทุน) + ProjectMarginChart + ProjectTable
- Closed section: แสดง ProjectTable เท่านั้น (ไม่มี chart) + empty state ถ้ายังไม่มี
- Type + PM filter ยังใช้งานได้กับทั้งสอง section

### Local Dev Setup + Expenses Dropdown (2026-04-21)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| Turbopack root config | `next.config.ts` | เพิ่ม `turbopack.root: __dirname` แก้ปัญหา Next.js 16 detect workspace root ผิด |
| Dev fallback to webpack | — | ใช้ `npx next dev --webpack` แทน Turbopack (Turbopack ยัง detect root ผิดแม้ตั้ง config) |
| Env minimal setup | `.env.local` | ต้องการแค่ 3 ตัวสำหรับดู dashboard: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (จาก JSON service account), `GOOGLE_SPREADSHEET_ID`, `NEXTAUTH_SECRET` — ที่เหลือข้ามได้ (dev bypass auth) |
| Expenses col B dropdown | Google Apps Script | ใส่ data validation ให้ Expenses col B เลือก project จาก `Project_Master!A2:A` + ล้าง validation เดิมใน col C |

#### Expenses Dropdown Apps Script (copy-paste)
วางใน Extensions → Apps Script:
```javascript
function setProjectDropdown() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const expenseSheet = ss.getSheetByName("Expenses");
  const projectSheet = ss.getSheetByName("Project_Master");
  const lastRow = projectSheet.getLastRow();
  const projectRange = projectSheet.getRange("A2:A" + lastRow);
  expenseSheet.getRange("C2:C1000").clearDataValidations();
  const targetRange = expenseSheet.getRange("B2:B1000");
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(projectRange, true)
    .setAllowInvalid(false)
    .build();
  targetRange.setDataValidation(rule);
}
```

### Automated Test Suite (2026-04-21)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| Automated test script | `test-dashboard.ts` | 34 tests covering all 13 dashboard functions — modifies real Sheet data, verifies computations, reverts changes automatically |
| Manual test plan | `TEST_PLAN.md` | 22 test cases with step-by-step instructions for manual verification of all 4 pages + 7 Sheet tabs |
| tsx dev dependency | `package.json` | Added `tsx` for running TypeScript test scripts directly |

#### Test Coverage (34 tests, all passing)
- **KPI tests (5):** Revenue, Expenses, Net Profit, Cash Balance, MoM comparison
- **Project tests (4):** Margin calculation, new expense impact, project status (running/closed), filter options
- **Cash Flow tests (5):** Cash KPIs, A/R Aging buckets, Cash Forecast, Outstanding AR, Net Cash Outlook
- **Expense tests (4):** Category grouping, Budget vs Actual, Anomaly detection (>2σ), new category addition
- **AR Installment tests (3):** Installment list, overdue sorting, status tracking
- **Monthly Trends tests (3):** Revenue/expense grouping, new month addition, period filtering
- **Cross-cutting tests (3):** Period picker boundary, data freshness, BL-Income auto-match
- **Edge cases (7):** Empty data, Thai date parsing, Buddhist Era year conversion, duplicate handling

#### How to Run
```bash
npx tsx --env-file .env.local test-dashboard.ts
# → "🏁 Results: 34 passed, 0 failed (31.6s)"
```

#### Known Test Observations
- Test 3.7 (Fixed_Cost recurring row): skipped — Sheet data has specific months in col A, no blank recurring rows
- Budget category names don't match Expenses categories (e.g., "Media Buying" vs "Media", "Office & Admin" vs "Office") — Budget vs Actual shows ฿0 actual for some categories
- Company financials: -140.8% margin, 1.1 month runway (real data reflection)

### UI Improvements & New Components (2026-04-02 ~ 04-08)
| สิ่งที่ทำ | ไฟล์ | หมายเหตุ |
|-----------|------|----------|
| KPI card info tooltip | `src/components/dashboard/kpi-card.tsx` | เพิ่ม `info` prop → hover ที่ icon แสดงคำอธิบายที่มาของค่า |
| Period picker in header | `src/components/layout/header.tsx` | ใส่ `<PeriodPicker />` ใน header (Suspense wrapped) |
| Mobile sidebar dark theme | `src/components/layout/mobile-sidebar.tsx` | Rewrite ทั้งไฟล์: dark theme, MAGIC branding, sections (Analytics/Actions), descriptions |
| Login page dark theme | `src/app/(auth)/login/page.tsx` | เปลี่ยน `bg-gray-50` → `bg-background` |
| Error boundary | `src/app/(dashboard)/error.tsx` | Error UI สำหรับ dashboard pages |
| Loading skeleton | `src/app/(dashboard)/loading.tsx` | Loading UI ระหว่างโหลดข้อมูล |
| Net Cash Outlook chart | `src/components/charts/net-cash-outlook.tsx` | Chart ใหม่: คาดการณ์เงินสดสุทธิ (inflow vs outflow) |
| Projects filter view | `src/components/dashboard/projects-view.tsx` | Client component: dropdown filter ตาม Type + PM + Quick Stats |
| Period picker component | `src/components/layout/period-picker.tsx` | Presets + Month grid + URL search params |
| Middleware → Proxy migration | `src/middleware.ts` (deleted) → `src/proxy.ts` | Next.js 16: middleware deprecated → ใช้ proxy แทน |
| searchParams as Promise | ทุก page.tsx | Next.js 16 breaking change: `searchParams` เป็น Promise ต้อง await |
| Revenue/Expense chart redesign | `charts/revenue-expense-trend.tsx` | ComposedChart: Bar (สุทธิ) + Area (รายรับ/รายจ่าย) + interactive legend + summary pills |
| Upload form improvements | `src/components/expenses/upload-form.tsx` | UI tweaks |


### Routing
```
/                     → redirect to /executive
/login                → Google OAuth (NextAuth)
/executive            → Tab 1: Executive Summary       (Server Component)
/projects             → Tab 2: Project Profitability   (Server Component)
/cashflow             → Tab 3: Cash Flow               (Server Component)
/expenses             → Tab 4: Expense Deep Dive       (Server Component)
/expenses/upload      → Expense Upload Form            (Client Component)
/api/auth/*           → NextAuth endpoints
/api/ocr              → AI OCR endpoint
/api/cron/reminders   → Cron job (payment reminders, daily 01:00 UTC)
/api/cron/sync-bl-status → Cron job (sync BL_Master → BL_Installment_Status, every 5 min)
/api/admin/sync-projects → POST: sync Projects tab from BL_Master (secret required)
/api/admin/sync-bl-status → POST: manual sync BL installment status (secret required)
```

### Key Conventions
- **Pages are Server Components** — call server actions directly, pass data as props to charts
- **Chart components are Client Components** — all have `'use client'` for Recharts
- **shadcn/ui** for base components (Card, Table, Badge, Button, etc.)
- **Tailwind CSS v4** — using `@import "tailwindcss"` syntax
- **Next.js 16** — `params`/`searchParams` are Promises (must await)

### Environment Variables (`.env.local`)
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=gzeed-service-acc-magic@strong-surfer-463907-k7.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=...
GOOGLE_SPREADSHEET_ID=1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI
GOOGLE_DRIVE_FOLDER_ID=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALENDAR_ID=...
GOOGLE_TASK_LIST_ID=...
CRON_SECRET=...
GOOGLE_GEMINI_API_KEY=...
GOOGLE_CHAT_WEBHOOK_URL=...   # Google Chat Space Webhook URL (สำหรับแจ้งเตือนเก็บเงิน)
```

---

## ⚠️ Known Issues & Technical Debt

1. **Auth bypass in dev** — dev bypass re-added ใน proxy.ts (NODE_ENV=development → skip auth) ⚠️ ต้องลบก่อน production deploy
2. **Data fetching not optimized** — แต่ละ server action call `getAllData()` แยก (batchGet ทุกครั้ง) → ควร cache หรือ share data ระหว่าง functions
3. **BL_Master ไม่มีสถานะ "จ่ายแล้ว"** — track ใน BL_Installment_Status tab (seeded 53 rows แล้ว) → ต้อง mark "Paid" เองเมื่อลูกค้าจ่าย
4. ~~**Income ยังเป็น mock data**~~ — ✅ เปลี่ยนเป็น real data จาก FlowAccount แล้ว (column mapping อัพเดตทั้งระบบ col L=มูลค่า)
5. ~~**BL-Income auto-match**~~ — ✅ Integrate แล้ว: `buildIncomeByProject()` + `autoMatchWithIncome()` ใน bl-parser.ts, เรียกใช้ใน dashboard.ts getAllData()
6. **Client-side router cache** — แก้ Sheet แล้ว navigate ใน app อาจไม่เห็นข้อมูลใหม่ ต้อง hard refresh (Cmd+Shift+R) — `force-dynamic` แก้ server-side แล้ว แต่ client router cache ยังอยู่
7. ~~**Debug endpoint**~~ — ✅ ลบ `src/app/api/debug-sheets/` แล้ว
8. **base-ui DropdownMenu** — ห้ามใส่ interactive elements (button, onClick) ข้างใน DropdownMenuContent จะ crash — ใช้ custom popover แทน
9. ~~**Script files ค้างใน root**~~ — ✅ ลบ 4 ไฟล์แล้ว (analyze-bl-income.cjs, create-bl-status-tab.cjs/.mjs, seed-bl-installments.cjs)
10. **Budget category mismatch** — Budget tab ใช้ "Media Buying"/"Office & Admin" แต่ Expenses tab ใช้ "Media"/"Office" → Budget vs Actual แสดง ฿0 actual สำหรับบาง category

---

## 📋 สิ่งที่ยังไม่ได้ทำ / ควรทำต่อ

### 🔴 High Priority
- [x] ~~**BL-Income auto-match**~~ — ✅ `buildIncomeByProject()` + `autoMatchWithIncome()` ใน bl-parser.ts → match BL กับ Income อัตโนมัติ
- [x] ~~**ใส่ข้อมูลจริง Income**~~ — ✅ Income tab เป็น real data จาก FlowAccount แล้ว, column mapping อัพเดตแล้ว
- [ ] **Production auth** — ลบ dev bypass ใน proxy.ts + ตั้ง Google OAuth redirect URI สำหรับ production domain
- [ ] **Set `GOOGLE_CHAT_WEBHOOK_URL`** — ใส่ Webhook URL จาก Google Chat Space ใน `.env.local` + Vercel env
- [x] ~~**Run `syncProjectsToSheet()`**~~ — ✅ สร้าง admin API: `POST /api/admin/sync-projects` (ใช้ x-cron-secret header)
- [x] ~~**ลบ script files**~~ — ✅ ลบ 4 ไฟล์แล้ว

### 🟡 Medium Priority
- [ ] **UI สำหรับ mark Paid** — ตอนนี้ต้องแก้ Google Sheet ตรง → ควรมีปุ่มใน dashboard
- [ ] **Expense Upload Form** — ปรับ theme + UX ให้ตรงกับ dashboard

### 🟢 Nice to Have
- [ ] **Real-time refresh** — auto refresh ทุก 5 นาที หรือมี refresh button
- [x] ~~**Date range filter**~~ — ✅ Period picker with presets + month grid
- [x] ~~**Project Filters**~~ — ✅ Dropdown filter ตาม Type + PM (ProjectsView component)
- [x] ~~**Loading states**~~ — ✅ `loading.tsx` skeleton ใน (dashboard) group
- [x] ~~**Error handling**~~ — ✅ `error.tsx` error boundary ใน (dashboard) group
- [x] ~~**Mobile sidebar dark theme**~~ — ✅ Rewrite ทั้งไฟล์ match dark theme + MAGIC branding
- [x] ~~**Net Cash Outlook chart**~~ — ✅ เพิ่มใน Cash Flow page
- [ ] **Budget category name matching** — แก้ Budget tab ให้ category ตรงกับ Expenses tab (หรือทำ fuzzy matching)
- [ ] **Export PDF/CSV** — ปุ่ม download report
- [ ] **Notification bell** — แจ้งเตือน invoice ใกล้ครบกำหนดใน app
- [ ] **Multi-company** — รองรับหลายชีท/บริษัท
- [ ] **Data caching** — Cache Google Sheet data เพื่อลด API calls
- [x] ~~**ลบ debug endpoint**~~ — ✅ ลบ `src/app/api/debug-sheets/` แล้ว

---

## 🗂️ File Structure (Source Only)

```
src/
├── actions/
│   ├── bl-status.ts          ← Read/write BL_Installment_Status tab (Pending/Paid/Overdue)
│   ├── dashboard.ts          ← Data fetching + calculations (ใช้ BL_Master แทน Projects_Master)
│   ├── expenses.ts           ← Submit expense to Sheet + Drive
│   ├── installments.ts       ← Manage installments (rewritten to use BL parser)
│   └── sync-projects.ts      ← Write derived Projects tab to Sheet
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx        ← Sidebar + Header wrapper (dark theme, force-dynamic)
│   │   ├── error.tsx         ← Error boundary UI (NEW)
│   │   ├── loading.tsx       ← Loading skeleton UI (NEW)
│   │   ├── executive/page.tsx ← Tab 1: Executive Summary (+ searchParams period)
│   │   ├── projects/page.tsx  ← Tab 2: Project Profitability (+ ProjectsView + filters)
│   │   ├── cashflow/page.tsx  ← Tab 3: Cash Flow + Net Cash Outlook + AR Installment Table
│   │   ├── expenses/
│   │   │   ├── page.tsx       ← Tab 4: Expense Deep Dive
│   │   │   └── upload/page.tsx ← AI OCR Upload Form (project dropdown from BL_Master)
│   ├── api/
│   │   ├── admin/
│   │   │   ├── sync-projects/route.ts ← POST: sync BL_Master → Projects tab
│   │   │   └── sync-bl-status/route.ts ← POST: manual sync BL installment status
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── cron/
│   │   │   ├── reminders/route.ts     ← Cron: payment reminders (daily)
│   │   │   └── sync-bl-status/route.ts ← Cron: sync BL_Master → BL_Installment_Status (every 5 min)
│   │   └── ocr/route.ts
│   ├── globals.css           ← Purple/black theme + glassmorphism + glow effects + Kanit font
│   ├── layout.tsx            ← Root layout (Kanit font, Thai + Latin subsets, Providers)
│   └── page.tsx              ← Redirect to /executive
├── components/
│   ├── charts/               ← 10 Recharts components (all 'use client')
│   │   ├── anomaly-table.tsx
│   │   ├── ar-aging.tsx
│   │   ├── budget-actual.tsx
│   │   ├── cash-forecast.tsx
│   │   ├── expense-donut.tsx
│   │   ├── net-cash-outlook.tsx
│   │   ├── project-margin.tsx
│   │   ├── project-ranking.tsx
│   │   ├── project-table.tsx
│   │   └── revenue-expense-trend.tsx
│   ├── dashboard/
│   │   ├── ar-installment-table.tsx  ← AR table + ปุ่ม "แจ้งทีม" (Calendar+Task+Chat, กดซ้ำได้)
│   │   ├── kpi-card.tsx              ← Reusable KPI card (glassmorphism, glow, + info tooltip)
│   │   └── projects-view.tsx         ← Client component: dropdown filter Type/PM
│   ├── expenses/
│   │   └── upload-form.tsx   ← OCR upload form
│   ├── layout/
│   │   ├── header.tsx        ← Top header (glass effect) + PeriodPicker
│   │   ├── mobile-sidebar.tsx ← Rewritten: dark theme, MAGIC branding, sections
│   │   ├── period-picker.tsx ← ช่วงเวลา: presets + month grid + prev/next
│   │   └── sidebar.tsx       ← Dark sidebar with nav
│   ├── providers.tsx         ← SessionProvider wrapper
│   └── ui/                   ← shadcn/ui components (15 files)
├── lib/
│   ├── ai/ocr.ts
│   ├── bl-parser.ts          ← Core BL parser: parseBLRows, parseInstallments, deriveProjects (pure logic, no I/O)
│   ├── format.ts             ← formatCurrency, formatPercent, formatCompact
│   ├── google/
│   │   ├── auth.ts
│   │   ├── calendar.ts
│   │   ├── drive.ts
│   │   ├── chat.ts           ← Google Chat Webhook notification
│   │   ├── sheets.ts         ← + writeSheet() bulk write utility
│   │   └── tasks.ts
│   └── utils.ts              ← cn() helper
├── proxy.ts                  ← Auth guard (Next.js 16 proxy, replaces middleware.ts)
└── types/index.ts             ← All TypeScript interfaces (+ blContractValue, BL fields)
```

---

## 🚀 วิธี Run

```bash
# Install dependencies
npm install

# Seed mock data (optional — already seeded)
node fix-sheets.mjs

# Start dev server
npm run dev
# → http://localhost:3000 (auto-redirect to /executive)

# Build for production
npm run build
```

---

## 📋 Pending Plan (High & Medium Priority Fixes)

Plan file: `~/.claude/plans/swirling-hatching-wind.md`

| Task | Status | Description |
|------|--------|-------------|
| Task 1: Production Auth | ⬜ ยังไม่ทำ | ลบ dev bypass ใน proxy.ts + ตั้ง OAuth redirect URI + Google Apps Script setup |
| Task 2: Mobile Sidebar Dark Theme | ✅ เสร็จ | Rewrite ทั้งไฟล์ — MAGIC branding, dark theme, sections |
| Task 3: Upload Form Dark Theme | ⬜ ยังไม่ทำ | แก้ hardcoded light colors |
| Task 4: Loading States (Skeleton) | ✅ เสร็จ | `loading.tsx` ใน (dashboard) group |
| Task 5: Error Boundaries | ✅ เสร็จ | `error.tsx` ใน (dashboard) group |
| Task 6: Project Filters | ✅ เสร็จ | `ProjectsView` component: dropdown Type + PM filter |
| Task 7: BL-Income auto-match | ✅ เสร็จ | `syncBLStatusFromIncome()` + auto-sync cron ทุก 5 นาที |
| Task 8: Google Apps Script | ⬜ ยังไม่ทำ | วาง onEdit trigger ใน Google Sheet สำหรับ real-time sync (ต้อง deploy ก่อน) |

---

## 📌 Tips สำหรับ AI ที่มาทำต่อ

1. **อ่าน `PROJECT_SPEC.md` ก่อน** — มี spec ละเอียดของ Google Sheet columns, Dashboard tabs, calculation formulas
2. **อ่าน `src/types/index.ts`** — ดู interfaces ทั้งหมดที่ใช้ในโปรเจกต์
3. **อ่าน `src/actions/dashboard.ts`** — มีทุก function ที่ดึง/คำนวณข้อมูลจาก Sheet
4. **อ่าน `src/lib/bl-parser.ts`** — core logic สำหรับ BL_Master (types, parser, project derivation)
5. **Next.js 16** — อ่าน `node_modules/next/dist/docs/01-app/` ก่อนเขียนโค้ด (มี breaking changes)
6. **Chart ต้อง `'use client'`** — เพราะ Recharts ต้องการ DOM
7. **Google Sheet เป็น database** — ไม่มี DB อื่น ทุกอย่างอ่าน/เขียนผ่าน `src/lib/google/sheets.ts`
8. **ทดสอบ dev** — auth ถูก bypass ใน dev mode (proxy.ts, NODE_ENV=development) สามารถเข้าหน้าได้เลย ⚠️ ลบก่อน production
9. **base-ui (ไม่ใช่ Radix)** — ใช้ `render` prop ไม่ใช่ `asChild`, ห้ามซ้อน interactive elements ใน DropdownMenu
10. **Period picker** — ใช้ URL search params `?from=YYYY-MM&to=YYYY-MM`, ทุก page ต้อง pass ให้ server actions
11. **`detectDataBoundary()`** — auto-detect ว่าข้อมูลอยู่ช่วงไหน ไม่ hardcode ปี
12. **BL_Master เป็น source of truth** — ข้อมูลโปรเจกต์/งวดจ่าย/AR ทั้งหมดมาจาก BL_Master (ไม่ใช้ Projects_Master, Invoice_Installments อีกแล้ว)
13. **QT_Master** — tab ใหม่ (Quotation) A-M, 13 columns — ยังไม่ถูก integrate เข้า dashboard code (ใช้แค่ใน Google Sheet ผ่าน Project_Master formula)
14. **Project_Master** — สร้างจาก QT_Master ด้วย QUERY formula: `=UNIQUE(QUERY(QT_Master!A:M,"SELECT E, D, M, H WHERE E IS NOT NULL AND M <> 'ไม่อนุมัติ'",1))` — auto-update, ใช้เป็น dropdown source สำหรับ Expenses
15. **env vars** — เก็บ manual (copy .env.local ข้ามเครื่อง) ไม่ได้ใช้ Doppler
16. **Revenue 2 แหล่ง** — `blContractValue` = ยอดจาก BL (ควรเก็บได้), `billedAmount` = ยอดจาก Income (เก็บจริง) — เทียบกันเพื่อดู gap
14. **Installment status** — BL ไม่มี "จ่ายแล้ว" → track ใน `BL_Installment_Status` tab แยก, ถ้า tab ไม่มีระบบ fallback เป็น Pending ทั้งหมด
