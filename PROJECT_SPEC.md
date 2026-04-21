# MAGIC Financial Dashboard — Project Specification

> **In-house Project** สำหรับ Marketing Agency
> ระบบ Dashboard แสดงสถานะทางการเงิน สำหรับ CEO / CFO

---

## 1. ภาพรวมโปรเจกต์ (Overview)

ระบบบริหารการเงินแบบ Real-time สำหรับ Marketing Agency ที่ใช้ **Google Sheets เป็น Database** โดยแสดงผลเป็น Web Dashboard บน **Next.js** ให้ CEO/CFO ดูสถานะทางการเงินได้ทันที

### หลักการทำงาน

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│  FlowAccount │────▶│  Google Sheet  │────▶│  Next.js Web App │
│  (ก้อปรายรับ) │     │  (Database)    │     │  (Dashboard)     │
└──────────────┘     └───────┬───────┘     └──────────────────┘
                             │
┌──────────────┐             │
│  สลิป / ใบเสร็จ │────▶ AI OCR ────▶ เพิ่มรายจ่าย
│  (รูปภาพ)      │     (Gemini)     + เก็บไฟล์ Drive
└──────────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|--------|
| Frontend | Next.js (App Router) + TypeScript | 16.2.1 |
| Styling | Tailwind CSS | v4 |
| Charts | Recharts | 3.8.1 |
| UI Components | shadcn/ui (Card, Table, Badge, etc.) | latest |
| Database | Google Sheets API v4 | |
| File Storage | Google Drive API v3 | |
| AI / OCR | Google Gemini 2.0 Flash | |
| Auth | NextAuth.js (Google OAuth) | |
| Automation | Vercel Cron + Google Calendar + Google Tasks | |
| Hosting | Vercel | |

---

## 2. Google Sheet Structure (Database)

Spreadsheet: **MAGIC ACCOUNTING**
Spreadsheet ID: `1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI`

### Tab 1: `Income` — รายรับ (ก้อปจาก FlowAccount)

> ข้อมูลมาจากการก้อปทีละแถวจากระบบ FlowAccount ไม่แก้ format

| Column | Header | Type | คำอธิบาย |
|--------|--------|------|----------|
| A | ลำดับที่ | number | Running number |
| B | เลขที่เอกสาร | string | เลข Invoice เช่น `INV202601001` |
| C | วัน/เดือน/ปี | date | วันที่ออกเอกสาร |
| D | ชื่อลูกค้า | string | ชื่อบริษัทลูกค้า |
| E | ชื่อโปรเจค | string | ชื่องาน เช่น `MAGIC x PMW Summer` |
| F | เลขผู้เสียภาษี | string | Tax ID ลูกค้า |
| G | สำนักงานใหญ่/สาขา | string | HQ / Branch |
| H | มูลค่า | number | ยอดก่อน VAT |
| I | ภาษีมูลค่าเพิ่ม | number | VAT 7% |
| J | ยอดรวมสุทธิ | number | **ยอดรวม (ใช้คำนวณ Revenue)** |
| K | เอกสารอ้างอิงในระบบ | string | System Reference |
| L | เลขที่อ้างอิง | string | เลข Reference |
| M | เอกสารอ้างอิงรับมัดจำ | string | Deposit Reference เช่น `DEP001` |
| N | สถานะ | string | **`รอเก็บเงิน` / `ชำระแล้ว`** (สำคัญ: ใช้คำนวณ A/R Aging) |
| O | พนักงานขาย | string | ชื่อ PM / Sales ที่ดูแล |

### Tab 2: `Expenses` — รายจ่าย (Simplified สำหรับกรอกด้วยมือ)

> ออกแบบให้เรียบง่าย สำหรับการกรอกด้วยมือ หรือจาก AI OCR สลิป

| Column | Header | Type | คำอธิบาย |
|--------|--------|------|----------|
| A | วันที่ | date | วันที่จ่าย (format: YYYY-MM-DD) |
| B | โปรเจค | string | ชื่อโปรเจคที่เกี่ยวข้อง |
| C | หมวดหมู่ | string | **ต้องตรงกับ Budget tab** (ดู Category List ด้านล่าง) |
| D | จำนวนเงิน | number | ยอดรวมที่จ่ายจริง (บาท) |
| E | รายละเอียด | string | คำอธิบายสั้นๆ เช่น "ค่าโฆษณา FB เดือน ม.ค." |
| F | รูปสลิป | URL | Link Google Drive ของรูปสลิป/ใบเสร็จ |

**Category List (หมวดหมู่ที่ใช้ได้):**

| Category Key | คำอธิบาย |
|-------------|----------|
| `Payroll` | เงินเดือนพนักงาน |
| `Media Buying` | ค่าซื้อสื่อโฆษณา (Facebook, Google, TikTok) |
| `Freelance` | ค่าจ้าง Freelance (ตากล้อง, กราฟิก, ครีเอทีฟ) |
| `Software Subscriptions` | ค่า Tool ต่างๆ (Adobe, Canva, Hootsuite) |
| `Office & Admin` | ค่าเช่า, ค่าไฟ, ค่าน้ำ, ค่าอินเทอร์เน็ต |
| `Travel` | ค่าเดินทาง, ค่าแท็กซี่, ค่าน้ำมัน |
| `Food` | ค่าอาหาร, สวัสดิการอาหาร |
| `Other` | เบ็ดเตล็ด, อื่นๆ |

### Tab 3: `Invoice_Installments` — งวดเก็บเงิน

> ใช้สำหรับ A/R Aging และ Cron Reminder

| Column | Header | Type | คำอธิบาย |
|--------|--------|------|----------|
| A | Invoice_No | string | เลข Invoice (ตรงกับ Income col B) |
| B | Installment_No | number | งวดที่ (1, 2, 3...) |
| C | Amount_Due | number | ยอดเงินที่ต้องเก็บงวดนี้ |
| D | Due_Date | date | วันครบกำหนดชำระ |
| E | Status | string | `Pending` / `Paid` / `Overdue` |
| F | Reminder_Sent | boolean | `TRUE` / `FALSE` (Cron จะอัพเดตเป็น TRUE เมื่อส่งแจ้งเตือนแล้ว) |

### Tab 4: `Projects_Master` — ข้อมูลโปรเจกต์หลัก

> ใช้เป็น Master Data สำหรับ Project Profitability

| Column | Header | Type | คำอธิบาย |
|--------|--------|------|----------|
| A | Project_Name | string | ชื่อโปรเจค |
| B | Client_Name | string | ชื่อลูกค้า |
| C | Type | string | `Project-based` / `Retainer` |
| D | Project_Manager | string | ชื่อ PM ที่ดูแล |
| E | Contract_Value | number | มูลค่าสัญญาทั้งหมด |

### Tab 5: `Cash_Balance` — ยอดเงินในบัญชี

> CFO อัพเดตยอดเงินคงเหลือ (ดึงจากบัญชีธนาคารจริง)

| Column | Header | Type | คำอธิบาย |
|--------|--------|------|----------|
| A | วันที่ | date | วันที่บันทึก |
| B | ยอดเงินในบัญชี | number | เงินสดคงเหลือ ณ วันนั้น |
| C | หมายเหตุ | string | บันทึกเพิ่มเติม |

### Tab 6: `Budget` — งบประมาณรายเดือน

> ใช้เทียบ Budget vs. Actual ใน Expense Deep Dive

| Column | Header | Type | คำอธิบาย |
|--------|--------|------|----------|
| A | หมวดหมู่ย่อย | string | ต้องตรงกับ Expenses col C |
| B | แผนก | string | `Marketing` / `Creative` / `Admin` |
| C | งบประมาณรายเดือน | number | งบ/เดือน (บาท) |
| D | หมายเหตุ | string | บันทึกเพิ่มเติม |

---

## 3. Features — ฟีเจอร์ทั้งหมด

### 3.1 🖼️ AI Slip Reader (OCR รูปสลิป)

**Flow:**
1. User อัพโหลดรูปสลิป/ใบเสร็จ ผ่านฟอร์มบน Web App
2. **Gemini 2.0 Flash** วิเคราะห์รูปและสกัดข้อมูล:
   - วันที่ → `วันที่` (col A)
   - จำนวนเงิน → `จำนวนเงิน` (col D)
   - หมวดหมู่ → `หมวดหมู่` (col C) — AI เลือกจาก Category List
   - คำอธิบาย → `รายละเอียด` (col E)
3. User ตรวจสอบ + เลือกโปรเจค + กด Submit
4. ระบบ **อัพโหลดรูปไป Google Drive** (แยกโฟลเดอร์ตาม ปี/เดือน/วัน)
5. ระบบ **Append ข้อมูลลง Google Sheet** tab `Expenses`

**Google Drive Folder Structure:**
```
📁 Expenses/
  📁 2026/
    📁 01/
      📁 15/
        🖼️ slip_001.jpg
        🖼️ receipt_002.png
      📁 16/
        🖼️ slip_003.jpg
    📁 02/
      ...
```

### 3.2 📧 Payment Reminder (แจ้งเตือนเก็บเงิน)

**Flow:**
1. **Vercel Cron** ทำงานทุกวัน (ตรวจสอบ `Invoice_Installments`)
2. หาใบแจ้งหนี้ที่ Status = `Pending` และ Due Date ภายใน 3 วันข้างหน้า
3. สร้าง **Google Calendar Event** (พร้อม Meet link) ส่งให้ทีม
4. สร้าง **Google Task** ใน Task List "แจ้งเก็บเงิน"
5. อัพเดต `Reminder_Sent` = `TRUE` ใน Sheet

### 3.3 🔐 Authentication

- **Google OAuth** ผ่าน NextAuth.js
- จำกัดเฉพาะ email ที่อนุญาต (whitelist)
- ป้องกันหน้า Dashboard ทั้งหมดผ่าน Middleware

---

## 4. Dashboard — 4 Tabs

### 🚩 Tab 1: Executive Summary

> หน้าแรกที่ CEO/CFO เปิดดูทุกเช้า — ดูชีพจรบริษัทได้ใน 5 วินาที

#### KPI Cards (แถวบนสุด — 4 การ์ด)

| KPI | แหล่งข้อมูล | การคำนวณ |
|-----|------------|----------|
| **Total Revenue** (YTD / MTD) | Income tab, col J | `SUM(ยอดรวมสุทธิ)` filter ตามปี/เดือน |
| **Total Expenses** (YTD / MTD) | Expenses tab, col D | `SUM(จำนวนเงิน)` filter ตามปี/เดือน |
| **Net Profit & Margin %** | คำนวณ | `Revenue - Expenses` / `(Revenue - Expenses) / Revenue * 100` พร้อม **ลูกศรสีเขียว/แดง** เทียบเดือนที่แล้ว |
| **Cash in Bank** | Cash_Balance tab, col B | แถวล่าสุด (ยอดเงินในบัญชีล่าสุด) |

#### Charts

| Chart | ประเภท | รายละเอียด |
|-------|--------|-----------|
| **Revenue vs Expense Trend** | Line Chart (เส้นคู่) หรือ Bar Chart | แสดง 12 เดือนย้อนหลัง, แกน X = เดือน, แกน Y = จำนวนเงิน, เส้นรายรับ (เขียว) vs เส้นรายจ่าย (แดง) |
| **Top 5 Projects** | Table (สีเขียว) | 5 โปรเจกต์กำไรสูงสุด: ชื่อ, ลูกค้า, Revenue, Costs, Margin % |
| **Bottom 5 Projects** | Table (สีแดง) | 5 โปรเจกต์กำไรน้อยที่สุด/ขาดทุน: ชื่อ, ลูกค้า, Revenue, Costs, Margin % |

**การคำนวณ Top/Bottom Projects:**
```
Per Project:
  Revenue = SUM(Income.ยอดรวมสุทธิ WHERE ชื่อโปรเจค = X)
  Costs   = SUM(Expenses.จำนวนเงิน WHERE โปรเจค = X)
  Profit  = Revenue - Costs
  Margin  = Profit / Revenue * 100
```

---

### 💼 Tab 2: Project & Client Profitability

> เจาะลึกกำไรรายโปรเจกต์ — ตอบคำถาม "ควรเลิกรับงานประเภทไหน?"

#### Filters

| Filter | ตัวเลือก | แหล่งข้อมูล |
|--------|---------|------------|
| ประเภทงาน | `Retainer` / `Project-based` / ทั้งหมด | Projects_Master col C |
| Project Manager | Dropdown ชื่อ PM | Projects_Master col D |

#### Charts & Tables

| Component | ประเภท | รายละเอียด |
|-----------|--------|-----------|
| **Project Margin Distribution** | Bar Chart (แนวนอน) | แต่ละโปรเจกต์แสดง Margin % แยกสี: เขียว (>20%), เหลือง (0-20%), แดง (<0%) |
| **Master Project Table** | Data Table (sortable) | ดูรายละเอียดด้านล่าง |

**Master Project Table Columns:**

| Column | แหล่งข้อมูล | คำอธิบาย |
|--------|------------|----------|
| ชื่อโปรเจกต์ | Projects_Master col A | |
| ชื่อลูกค้า | Projects_Master col B | |
| Contract Value | Projects_Master col E | มูลค่าสัญญาทั้งหมด |
| Billed | Income → SUM(col J) per project | วางบิลไปแล้วเท่าไหร่ |
| Direct Costs | Expenses → SUM(col D) per project | ต้นทุนตรง |
| Actual Margin % | `(Billed - Direct Costs) / Billed * 100` | กำไรจริง |
| Status | คำนวณจาก Margin | 🟢 >20% / 🟡 0-20% / 🔴 <0% |

---

### 💸 Tab 3: Cash Flow & Financial Health

> CFO ใช้ประเมินความเสี่ยงและสภาพคล่อง

#### KPI Cards

| KPI | การคำนวณ |
|-----|----------|
| **Cash in Bank** | Cash_Balance tab → แถวล่าสุด |
| **Cash Runway** | `Cash in Bank / Monthly Burn Rate` = จำนวนเดือนที่อยู่ได้ |
| **Monthly Burn Rate** | ค่าเฉลี่ยรายจ่าย 3 เดือนล่าสุด |
| **Outstanding A/R** | SUM(Invoice_Installments.Amount_Due WHERE Status ≠ Paid) |

#### Charts

| Chart | ประเภท | รายละเอียด |
|-------|--------|-----------|
| **A/R Aging** | Stacked Bar Chart | แบ่งหนี้ค้างตามอายุ: `0-30 วัน` (เขียว), `31-60 วัน` (เหลือง), `61-90 วัน` (ส้ม), `>90 วัน` (**แดงเด่น**) |
| **Cash Forecast** | Area Chart | คาดการณ์ 3 เดือน: `เงินสดปัจจุบัน + หนี้ที่คาดว่าเก็บได้` − `รายจ่ายประจำ` |

**A/R Aging Calculation:**
```
สำหรับแต่ละ Installment ที่ Status ≠ Paid:
  อายุหนี้ = วันนี้ - Due_Date
  
  ถ้าอายุหนี้ 0-30 วัน  → bucket "0-30"
  ถ้าอายุหนี้ 31-60 วัน → bucket "31-60"
  ถ้าอายุหนี้ 61-90 วัน → bucket "61-90"
  ถ้าอายุหนี้ >90 วัน   → bucket ">90" (🔴 แดง!)
```

**Cash Forecast Calculation:**
```
สำหรับแต่ละเดือนถัดไป (M+1, M+2, M+3):
  Projected Cash = Current Cash
    + SUM(Installments ที่ Due ในเดือนนั้น AND Status = Pending)  // คาดว่าจะเก็บได้
    - Monthly Burn Rate                                           // รายจ่ายประจำ
```

---

### 📊 Tab 4: Expense Deep Dive

> ชำแหละรายจ่าย — ดูว่าเงินรั่วไหลไปกับอะไร

#### Charts & Tables

| Component | ประเภท | รายละเอียด |
|-----------|--------|-----------|
| **Expense by Category** | Donut Chart | แยกตาม หมวดหมู่ (Expenses col C): Payroll, Media Buying, Freelance, Software, Office, Travel, Food, Other — แสดง % ของทั้งหมด |
| **Budget vs Actual** | Grouped Bar Chart | เทียบ Budget tab (งบประมาณ) vs Expenses จริง, แยกตามแผนก (Marketing, Creative, Admin) สีเขียว = ใช้ไม่เกินงบ, สีแดง = เกินงบ |
| **Recent Anomalies** | Alert Table | รายการที่จำนวนเงินสูงกว่าค่าเฉลี่ยของหมวดหมู่นั้น > 2x (2 standard deviations) — แสดง: วันที่, โปรเจค, หมวดหมู่, จำนวนเงิน, % เกินปกติ, รูปสลิป |

**Budget vs Actual Calculation:**
```
สำหรับแต่ละ Category ใน Budget tab:
  Budget    = Budget.งบประมาณรายเดือน
  Actual    = SUM(Expenses.จำนวนเงิน WHERE หมวดหมู่ = Category AND เดือนนี้)
  Variance  = Budget - Actual
  Status    = Variance >= 0 ? "ใช้ไม่เกินงบ 🟢" : "เกินงบ 🔴"
```

**Anomaly Detection:**
```
สำหรับแต่ละรายจ่าย:
  avg = AVERAGE(Expenses.จำนวนเงิน WHERE หมวดหมู่ = same category)
  std = STDEV(Expenses.จำนวนเงิน WHERE หมวดหมู่ = same category)
  
  ถ้า amount > avg + (2 * std) → ⚠️ Anomaly!
  deviation = ((amount - avg) / avg) * 100  // สูงกว่าปกติ กี่ %
```

---

## 5. Expense Upload Flow (ฟอร์มบันทึกรายจ่าย)

### UI Flow

```
┌─────────────────────────────────────┐
│  📸 อัพโหลดสลิป / ใบเสร็จ           │
│  ┌───────────────────┐              │
│  │                   │              │
│  │   Drop Zone       │  ← ลากวาง   │
│  │   📷 คลิกเลือก    │    หรือคลิก  │
│  │                   │              │
│  └───────────────────┘              │
│                                     │
│  🤖 AI กำลังอ่านสลิป... (Loading)    │
│                                     │
│  ──── AI อ่านได้แล้ว ────            │
│                                     │
│  วันที่:     [2026-01-15    ] ✏️     │
│  จำนวนเงิน:  [15,000       ] ✏️     │
│  หมวดหมู่:   [Media Buying ▾] ✏️     │
│  รายละเอียด: [ค่าโฆษณา FB  ] ✏️     │
│  โปรเจค:     [MAGIC x PMW  ▾]       │
│                                     │
│  [ 💾 บันทึกรายจ่าย ]               │
└─────────────────────────────────────┘
```

### Submit Flow

1. กด "บันทึกรายจ่าย"
2. **อัพโหลดรูป → Google Drive** (โฟลเดอร์: `Expenses/YYYY/MM/DD/`)
3. **Append ข้อมูลลง Sheet** tab `Expenses`: `[วันที่, โปรเจค, หมวดหมู่, จำนวนเงิน, รายละเอียด, DriveURL]`
4. แสดง ✅ สำเร็จ

---

## 6. Cron Jobs (ระบบอัตโนมัติ)

| Job | Schedule | หน้าที่ |
|-----|----------|---------|
| **Payment Reminder** | ทุกวัน 09:00 | ตรวจ Invoice_Installments → ส่ง Calendar + Task reminder สำหรับใบแจ้งหนี้ที่ใกล้ครบกำหนด 3 วัน |

---

## 7. Page Structure (Routing)

> ใช้ Next.js App Router route groups: `(auth)` สำหรับ login, `(dashboard)` สำหรับ dashboard pages

```
/                    → Redirect to /executive
/login               → Login Page (Google OAuth)
/executive           → Tab 1: Executive Summary
/projects            → Tab 2: Project & Client Profitability
/cashflow            → Tab 3: Cash Flow & Financial Health
/expenses            → Tab 4: Expense Deep Dive
/expenses/upload     → ฟอร์มบันทึกรายจ่าย + AI OCR
/api/auth/*          → NextAuth API
/api/ocr             → AI OCR endpoint
/api/cron/reminders  → Cron job (payment reminders)
```

---

## 8. Code Status (as of 2026-03-31)

> ทุก component ใน Section 4 สร้างเสร็จแล้วและทำงานได้กับ mock data
> อ่าน `PROGRESS.md` สำหรับรายละเอียดเพิ่มเติม

### ✅ Infrastructure

| Component | File | สถานะ |
|-----------|------|--------|
| Google Auth | `src/lib/google/auth.ts` | ✅ |
| Sheets API (CRUD) | `src/lib/google/sheets.ts` | ✅ |
| Drive Upload | `src/lib/google/drive.ts` | ✅ |
| Calendar Event | `src/lib/google/calendar.ts` | ✅ |
| Google Tasks | `src/lib/google/tasks.ts` | ✅ |
| AI OCR (Gemini) | `src/lib/ai/ocr.ts` | ✅ |
| OCR API Route | `src/app/api/ocr/route.ts` | ✅ |
| Submit Expense Action | `src/actions/expenses.ts` | ✅ |
| Installments Action | `src/actions/installments.ts` | ✅ |
| Dashboard Data Actions | `src/actions/dashboard.ts` | ✅ 10 functions |
| Cron Reminders | `src/app/api/cron/reminders/route.ts` | ✅ |
| NextAuth Config | `src/app/api/auth/` | ✅ |
| Middleware (Auth) | `src/middleware.ts` | ✅ (dev bypass) |
| Types | `src/types/index.ts` | ✅ |
| Format Helpers | `src/lib/format.ts` | ✅ |

### ✅ Dashboard UI

| Component | File | สถานะ |
|-----------|------|--------|
| Dashboard Layout | `src/app/(dashboard)/layout.tsx` | ✅ Dark theme |
| Sidebar | `src/components/layout/sidebar.tsx` | ✅ Glassmorphism |
| Header | `src/components/layout/header.tsx` | ✅ Glass blur |
| KPI Card | `src/components/dashboard/kpi-card.tsx` | ✅ Glow variants |
| Executive Summary Page | `src/app/(dashboard)/executive/page.tsx` | ✅ |
| Projects Page | `src/app/(dashboard)/projects/page.tsx` | ✅ |
| Cash Flow Page | `src/app/(dashboard)/cashflow/page.tsx` | ✅ |
| Expense Deep Dive Page | `src/app/(dashboard)/expenses/page.tsx` | ✅ |
| Expense Upload Page | `src/app/(dashboard)/expenses/upload/page.tsx` | ✅ |

### ✅ Chart Components (ทุกตัว `'use client'` + Recharts)

| Component | File | Type |
|-----------|------|------|
| Revenue vs Expense Trend | `src/components/charts/revenue-expense-trend.tsx` | ComposedChart |
| Project Ranking | `src/components/charts/project-ranking.tsx` | Card list |
| Project Margin | `src/components/charts/project-margin.tsx` | Horizontal Bar |
| Project Table | `src/components/charts/project-table.tsx` | Sortable Table |
| A/R Aging | `src/components/charts/ar-aging.tsx` | BarChart |
| Cash Forecast | `src/components/charts/cash-forecast.tsx` | AreaChart |
| Expense Donut | `src/components/charts/expense-donut.tsx` | PieChart |
| Budget vs Actual | `src/components/charts/budget-actual.tsx` | Grouped Bar |
| Anomaly Table | `src/components/charts/anomaly-table.tsx` | Alert Table |

### 🔨 ยังต้องปรับปรุง

| สิ่งที่ต้องทำ | ไฟล์ | Priority |
|-------------|------|----------|
| Project page filters (Type, PM) | `src/app/(dashboard)/projects/page.tsx` | 🟡 Medium |
| Upload form dark theme | `src/components/expenses/upload-form.tsx` | 🟡 Medium |
| Mobile sidebar match theme | `src/components/layout/mobile-sidebar.tsx` | 🟡 Medium |
| Loading skeletons | ทุกหน้า | 🟡 Medium |
| Error boundaries | ทุกหน้า | 🟡 Medium |
| Fix TS lint (asChild) | `src/components/layout/header.tsx` | 🟢 Low |
| Remove dev auth bypass | `src/middleware.ts` | 🔴 Before deploy |

---

## 9. Design Direction

- **Dark Mode by Default** — ดูเป็น premium financial dashboard
- **Color System:** OkLCH-based (ใน `globals.css`)
  - Background: `oklch(0.07 0.01 260)` (near black with navy tint)
  - Cards: glassmorphism (`--glass-bg`, backdrop-blur)
  - Profit/Positive: `oklch(0.75 0.18 162)` (teal green) — `.glow-profit`
  - Loss/Negative: `oklch(0.65 0.2 25)` (coral red) — `.glow-loss`
  - Warning: `oklch(0.8 0.15 85)` (amber) — `.glow-warning`
  - Chart colors: `--chart-1` through `--chart-5` CSS variables
- **Font:** Geist Sans (Next.js bundled)
- **Key CSS classes:**
  - `.glass-card` — glassmorphism card with border glow
  - `.glow-profit`, `.glow-loss`, `.glow-warning` — subtle border glow effects
- **Charts:** Recharts with OkLCH colors, custom tooltips using `.glass-card`
- **Responsive** — รองรับ Desktop + Tablet (sidebar ซ่อนบน mobile, ใช้ Sheet drawer)

---

## 10. Mock Data & Testing

- **Mock data seeder:** `fix-sheets.mjs` — run `node fix-sheets.mjs` เพื่อ seed ข้อมูลทดสอบ
- **Mock data ประกอบด้วย:**
  - 8 โปรเจกต์ (PMW, STADA, Bluekoff, TrueMove H, SCB Julius Baer, CP ALL, Minor Food, Ananda)
  - 30 invoices กระจาย Apr 2025 – Mar 2026
  - 63 expenses ทุก category
  - 17 installments (Pending/Paid/Overdue)
  - 12 เดือน cash balance
  - 8 budget categories
- **Dev auth bypass:** Middleware skip auth เมื่อ `NODE_ENV=development` → เข้าหน้า dashboard ได้เลยไม่ต้อง login
