# MAGIC Financial Dashboard — คู่มือการใช้งาน

> ระบบติดตามการเงินสำหรับ Marketing Agency — ดูสถานะการเงินแบบ real-time จาก Google Sheets

---

## 🌐 เข้าสู่ระบบ

**URL:** https://magic-financial-dashboard-v1.vercel.app

1. กด **"เข้าสู่ระบบด้วย Google"**
2. เลือก Google account (ต้องเป็น email ที่อยู่ใน allowlist เท่านั้น)
3. ระบบ redirect ไปหน้า Executive Summary อัตโนมัติ

**การเพิ่มผู้ใช้ใหม่** — ติดต่อ admin ให้เพิ่ม email เข้า env var `ALLOWED_EMAILS` ใน Vercel

---

## 📊 หน้าจอ Dashboard (4 หน้า)

### 1. Executive Summary (`/executive`)
ภาพรวมการเงินสำหรับผู้บริหาร

**ดูอะไรได้:**
- **4 KPI cards** — Total Revenue, Total Expenses, Net Profit & Margin, Cash in Bank (พร้อมเทียบเดือนก่อนหน้า)
- **Revenue/Expense Trend** — กราฟ 12 เดือนล่าสุด (กดที่ legend เพื่อซ่อน/แสดง)
- **Top/Bottom 5 Projects** — โปรเจกต์ที่ทำกำไรสูงสุด/ต่ำสุด

### 2. Project Profitability (`/projects`)
วิเคราะห์ความสามารถทำกำไรรายโปรเจกต์

**ดูอะไรได้:**
- **กำลังดำเนินงาน** — โปรเจกต์ที่ยังเก็บเงินไม่ครบ + Margin Chart + Table
- **ปิดแล้ว** — โปรเจกต์ที่ลูกค้าจ่ายครบแล้ว
- **Filter:** ตาม Type (Retainer / Project-based) และ Project Manager

### 3. Cash Flow (`/cashflow`)
สถานะเงินสด + AR (หนี้ค้างรับ)

**ดูอะไรได้:**
- **4 KPI cards** — Cash, Runway (กี่เดือนที่อยู่ได้), Burn Rate, Outstanding A/R
- **A/R Aging Chart** — แบ่งหนี้ตาม 0-30 / 31-60 / 61-90 / >90 วัน
- **Cash Forecast** — คาดการณ์เงินสด 3 เดือนข้างหน้า
- **Net Cash Outlook** — เงินสดเข้า vs ค่าใช้จ่ายคงที่
- **AR Installment Table** — รายการงวดที่ยังไม่จ่าย + ปุ่ม **"แจ้งทีม"** (กดส่งเตือนเก็บเงิน)

### 4. Expense Deep Dive (`/expenses`)
วิเคราะห์รายจ่าย

**ดูอะไรได้:**
- **Expense by Category** — สัดส่วนรายจ่ายตามหมวดหมู่ (Donut chart)
- **Budget vs Actual** — งบประมาณ vs ที่ใช้จริง
- **Recent Anomalies** — รายจ่ายผิดปกติ (สูงกว่าค่าเฉลี่ย >2σ)

### 5. Upload Slip (`/expenses/upload`)
อัพโหลดสลิปเข้า Sheet ผ่าน AI OCR

**วิธีใช้:**
1. เลือกรูปสลิป
2. AI Gemini อ่านข้อมูล: วันที่, จำนวนเงิน, หมวดหมู่
3. เลือกโปรเจกต์ที่เกี่ยวข้อง (dropdown ดึงจาก BL_Master)
4. กด Submit → บันทึกลง Sheet `Expenses` + อัพโหลดรูปไป Drive

---

## 🗓️ การเลือกช่วงเวลา (Period Picker)

อยู่บน header ของทุกหน้า

**Presets:**
- เดือนนี้
- ปีนี้
- ปีก่อน
- ทั้งหมด

**Custom:** เลือกเดือน-ปี เริ่ม-จบ ใน Month grid

**Prev/Next:** เลื่อนช่วงเวลาไปข้างหน้า/ย้อนหลัง

---

## 📝 การจัดการข้อมูลใน Google Sheet

ระบบใช้ **Google Sheet** เป็น database — แก้ที่ Sheet ข้อมูลใน Dashboard อัพเดตอัตโนมัติ

### Spreadsheet
**MAGIC ACCOUNTING** (ID: `1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI`)

### Tabs ที่ใช้

| Tab | ใช้ทำอะไร | Column สำคัญ |
|---|---|---|
| `Income` | รายรับจาก FlowAccount (20 col) | B=วันที่, L=มูลค่า |
| `Expenses` | รายจ่าย (6 col) | A=วันที่, B=โปรเจกต์ (dropdown), C=หมวดหมู่, D=คำอธิบาย, E=จำนวน, F=URL สลิป |
| `BL_Master` | ใบวางบิล (16 col) | F=ชื่อโปรเจกต์, H=ครบกำหนด, L=ยอดสุทธิ, N=สถานะ, P=งวดในหมายเหตุ |
| `BL_Installment_Status` | สถานะการจ่ายแต่ละงวด | C=Status (Pending/Paid/Overdue), I=Amount override |
| `Cash_Balance` | ยอดเงินสดรายเดือน | A=เดือน, B=ยอด |
| `Budget` | งบประมาณตามหมวดหมู่ | A=หมวดหมู่, B=งบ |
| `Fixed_Costs` | ค่าใช้จ่ายคงที่ | — |
| `QT_Master` | ใบเสนอราคา (13 col) | M=สถานะ (อนุมัติ/ไม่อนุมัติ) |
| `Project_Master` | ผูก dropdown ใน Expenses col B | สร้างจาก QT_Master ด้วย QUERY formula |

### ⚠️ สิ่งที่ห้ามทำ
- **อย่าเปลี่ยนชื่อ tab** — code ใช้ชื่อ tab ตรงๆ
- **อย่าเปลี่ยนลำดับ column** — code อ้างอิงตาม index
- **อย่าลบหัวตาราง (row 1)** — ใช้สำหรับ skip header

---

## 🔄 Workflow ทั่วไป

### A. เพิ่มใบวางบิลใหม่ (BL)
1. เปิด Sheet → tab **`BL_Master`**
2. เพิ่มแถวใหม่ — ใส่ครบทุก column (A-P)
3. Col P (หมายเหตุ) — ถ้ามีงวดจ่าย ระบุในรูปแบบ:
   - `งวดที่ 1 1 มกราคม 2569 ยอด 26,788.67 บาท`
   - หรือ `50% ภายในวันที่ 15 มีนาคม 2569`
4. รอ ~5 นาที (cron-job.org sync) → BL ใหม่จะขึ้นใน Cash Flow page อัตโนมัติ

### B. Mark งวดเป็น Paid (กรณีลูกค้าจ่ายแล้ว)

**วิธี 1: Auto-match (ระบบทำให้เอง)**
- เพิ่มรายการรับเงินในtab `Income` (col B=วันที่, E=ชื่อโปรเจกต์, L=มูลค่า)
- ระบบ match ยอดกับงวดของโปรเจกต์นั้นให้อัตโนมัติ (เก่าก่อน)
- ถ้า income เหลือ ≥ ยอดงวด → mark **Paid** ให้

**วิธี 2: Manual override**
- เปิด Sheet → tab **`BL_Installment_Status`**
- หา row ของ BL + งวด → col C เปลี่ยนจาก `Pending` → `Paid`
- (Manual ทับ Auto-match — ใช้กรณีที่ Income ยังไม่มาแต่รู้ว่าจ่ายแล้ว)

### C. ส่งแจ้งเตือนเก็บเงิน
1. เข้า **Cash Flow** page → AR Installment Table
2. หา row ที่ต้องการแจ้ง → กดปุ่ม **🔔 แจ้งทีม**
3. ระบบสร้าง 3 อย่าง:
   - 📅 **Calendar event** — บนวันครบกำหนด เวลา 09:00
   - ✅ **Google Task** — ใน list "แจ้งเก็บเงิน"
   - 💬 **Chat notification** — ส่งทันทีไปยัง Google Chat Space
4. กดได้หลายรอบ — แสดง "แจ้งแล้ว X ครั้ง" ใต้ปุ่ม

### D. บันทึกรายจ่าย (วิธีเร็ว — AI OCR)
1. ไปหน้า **Upload Slip** (`/expenses/upload`)
2. เลือกรูปสลิป (jpg/png)
3. AI อ่านอัตโนมัติ — ตรวจสอบ/แก้ไขถ้าผิด
4. เลือก **โปรเจกต์ที่เกี่ยวข้อง** จาก dropdown
5. กด **Submit** → บันทึก + อัพโหลดสลิปไป Drive

### E. บันทึกรายจ่าย (วิธี manual)
1. เปิด Sheet → tab **`Expenses`**
2. เพิ่มแถวใหม่:
   - A: วันที่ (dd/mm/yyyy)
   - B: โปรเจกต์ (เลือกจาก dropdown — จะมีรายการจาก Project_Master)
   - C: หมวดหมู่ (Freelance/Media/Travel/Food/Payroll/Office/Software)
   - D: คำอธิบาย
   - E: จำนวนเงิน
   - F: URL สลิป (ถ้ามี)

### F. แก้ไขงบประมาณ
- เปิด Sheet → tab **`Budget`**
- A=หมวดหมู่, B=งบประมาณรายเดือน
- **สำคัญ:** ชื่อหมวดหมู่ต้องตรงกับใน Expenses (เช่น "Media" ไม่ใช่ "Media Buying")

---

## 🤖 ระบบอัตโนมัติ

| ระบบ | ตารางเวลา | ทำอะไร |
|---|---|---|
| **Sync BL Status** | ทุก 5 นาที (cron-job.org) | match ยอด Income กับ BL งวด → mark Paid |
| **Daily Reminder** | 08:00 ไทยทุกวัน (Vercel Cron) | แจ้งเตือนงวดที่ครบกำหนด **พรุ่งนี้** ที่ยังไม่เคยแจ้ง |
| **Period Detection** | Real-time | auto-detect ช่วงข้อมูลที่มี (min/max date) |
| **Project Type Detection** | Real-time | ≥3 BLs/project = Retainer, อื่นๆ = Project-based |

---

## ❓ Troubleshooting

### Dashboard แสดง ฿0 ทั้งหมด
- ตรวจ env vars ใน Vercel: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID`
- เช็คว่า Service Account email มีสิทธิ์เข้าถึง Sheet (Share → Editor)

### Login ไม่ได้ "Access blocked"
- email ไม่อยู่ใน `ALLOWED_EMAILS` → ติดต่อ admin
- หรือ OAuth Consent Screen เป็น Testing mode → ต้องเพิ่ม email เป็น Test user

### กดแจ้งทีมขึ้น "Missing required parameters: calendarId"
- ขาด env var `GOOGLE_CALENDAR_ID`, `GOOGLE_TASK_LIST_ID`, หรือ `GOOGLE_CHAT_WEBHOOK_URL`

### ข้อมูลใน Sheet เปลี่ยนแล้วแต่ Dashboard ไม่อัพเดต
- กด **Cmd+Shift+R** (hard refresh) — client cache อาจค้าง
- รอ ~5 นาที สำหรับ BL status sync

### Auto-match ผิด (mark Paid ทั้งที่ไม่ควร)
- ตรวจชื่อโปรเจกต์ใน Income (col E) ตรงกับ BL_Master (col F) เป๊ะๆ
- หรือ override ใน BL_Installment_Status manual

---

## 📞 ผู้รับแจ้งเตือน (Hardcoded)
- magic.agencyth@gmail.com
- tassaphon@gmail.com
- kanyapat.contact@gmail.com

---

## 🔗 ลิงก์สำคัญ

- **Dashboard:** https://magic-financial-dashboard-v1.vercel.app
- **Spreadsheet:** https://docs.google.com/spreadsheets/d/1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI
- **GitHub:** https://github.com/gzeeddestiny/magic_financial_dashboard
- **Vercel Project:** Vercel Dashboard → magic-financial-dashboard-v1
- **External Cron:** https://cron-job.org (sync-bl-status ทุก 5 นาที)
