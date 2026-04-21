# Test Plan: Google Sheet → Dashboard Verification

> **เป้าหมาย:** เทสว่าทุก function ที่แสดงผลบน Dashboard อ่านข้อมูลจาก Google Sheet ถูกต้อง
> **วิธี:** แก้ข้อมูลใน Sheet → Hard Refresh (Cmd+Shift+R) → เช็คผลบน Dashboard
> **Sheet:** `MAGIC ACCOUNTING` (ID: `1YHlqwraqAWj_ypKx0PUyLKYOBn4oQgsDJc9CK28_SyI`)
> **Dashboard URL:** `http://localhost:3000`

---

## ⚠️ กฎสำคัญ

1. **จดค่าเดิมก่อนแก้ทุกครั้ง** — แก้กลับหลังเทสเสร็จ
2. **Hard Refresh (Cmd+Shift+R)** หลังแก้ Sheet ทุกครั้ง — client router cache ไม่อัพเดตเอง
3. **ใช้ date ที่อยู่ใน period ปัจจุบัน** (ม.ค.-เม.ย. 2026) — ถ้า date อยู่นอก period, Dashboard จะไม่แสดง
4. **ตัวเลขใน Sheet ใช้ comma** เช่น `25,000` — ระบบ parse comma ได้

---

## Page 1: `/executive` — Executive Summary

---

### ✅ Test 1.1 — Income col L → Revenue KPI

**เป้าหมาย:** เช็คว่า KPI "Total Revenue" อ่านค่าจาก Income tab col L (มูลค่า) ถูกต้อง

**ขั้นตอน:**

1. เปิด Dashboard → `/executive`
2. จดค่า **"Total Revenue (YTD)"** จาก KPI card → เช่น `฿1,234,567`
3. เปิด Google Sheet → tab `Income`
4. หา row ที่มี:
   - col B (วัน/เดือน/ปี) = วันที่ในปี 2026 เช่น `15/01/2026`
   - col L (มูลค่า) มีตัวเลข เช่น `25,000`
5. **จดค่าเดิม** col L ของ row นั้น → เช่น `25,000`
6. แก้ col L เป็น `35,000` (เพิ่ม 10,000)
7. กลับมาที่ Dashboard → **Cmd+Shift+R**
8. เช็ค KPI "Total Revenue (YTD)"

**ผลที่ถูกต้อง:**
- Revenue ต้องเพิ่มขึ้น **10,000** จากค่าเดิม
- เช่น เดิม `฿1,234,567` → ใหม่ `฿1,244,567`

**แก้กลับ:** col L → `25,000` (ค่าเดิม)

---

### ✅ Test 1.2 — Expenses col D → Expenses KPI

**เป้าหมาย:** เช็คว่า KPI "Total Expenses" อ่านค่าจาก Expenses tab col D (amount) ถูกต้อง

**ขั้นตอน:**

1. เปิด Dashboard → `/executive`
2. จดค่า **"Total Expenses (YTD)"** → เช่น `฿567,890`
3. เปิด Google Sheet → tab `Expenses`
4. หา row ที่มี:
   - col A (date) = วันที่ในปี 2026 เช่น `15/01/2026`
   - col D (amount) มีตัวเลข เช่น `8,000`
5. **จดค่าเดิม** col D → `8,000`
6. แก้ col D เป็น `18,000` (เพิ่ม 10,000)
7. Dashboard → **Cmd+Shift+R**
8. เช็ค KPI "Total Expenses (YTD)"

**ผลที่ถูกต้อง:**
- Expenses ต้องเพิ่มขึ้น **10,000**
- เช่น เดิม `฿567,890` → ใหม่ `฿577,890`

**แก้กลับ:** col D → `8,000`

---

### ✅ Test 1.3 — Net Profit = Revenue − Expenses

**เป้าหมาย:** เช็คว่า Net Profit คำนวณจาก Revenue - Expenses ถูกต้อง

**ขั้นตอน:**

1. เปิด Dashboard → `/executive`
2. จดค่าจาก 3 KPI cards:
   - Total Revenue = `A`
   - Total Expenses = `B`
   - Net Profit = `C`
   - Margin % = `D`
3. คำนวณเอง:
   - Net Profit ที่ถูกต้อง = `A - B`
   - Margin ที่ถูกต้อง = `((A - B) / A) × 100`

**ผลที่ถูกต้อง:**
- `C` = `A - B` (ยอม error ±1 จาก rounding)
- `D` = `((A - B) / A) × 100` ทศนิยม 1 ตำแหน่ง

**ไม่ต้องแก้ Sheet** — เป็น cross-check คำนวณ

---

### ✅ Test 1.4 — Cash_Balance → Cash in Bank

**เป้าหมาย:** เช็คว่า KPI "Cash in Bank" อ่านจาก Cash_Balance tab แถวสุดท้าย col B

**ขั้นตอน:**

1. เปิด Dashboard → `/executive`
2. จดค่า **"Cash in Bank"** → เช่น `฿2,500,000`
3. เปิด Google Sheet → tab `Cash_Balance`
4. ไปที่ **แถวสุดท้าย** ที่มีข้อมูล
5. **จดค่าเดิม** col B (Balance) → เช่น `2,500,000`
6. แก้ col B เป็น `3,000,000` (เพิ่ม 500,000)
7. Dashboard → **Cmd+Shift+R**
8. เช็ค KPI "Cash in Bank"

**ผลที่ถูกต้อง:**
- Cash in Bank = `฿3,000,000`

**แก้กลับ:** col B → `2,500,000`

---

### ✅ Test 1.5 — Trend Chart (Revenue/Expense) เปลี่ยนตาม

**เป้าหมาย:** เช็คว่า Revenue/Expense Trend chart อัพเดตตามข้อมูลที่แก้

**ขั้นตอน:**

1. เปิด Dashboard → `/executive` → ดู chart "Revenue vs Expense Trend"
2. จดค่าแท่ง Revenue ของ **เดือน ม.ค. 2026** (hover ที่แท่งจะเห็นตัวเลข)
3. เปิด Google Sheet → tab `Income`
4. หา row ที่ col B (date) อยู่ใน **มกราคม 2026** (เช่น `15/01/2026`)
5. **จดค่าเดิม** col L → เช่น `30,000`
6. แก้ col L เป็น `130,000` (เพิ่ม 100,000 ให้เห็นชัด)
7. Dashboard → **Cmd+Shift+R**
8. Hover ที่แท่ง ม.ค. 2026 ใน chart

**ผลที่ถูกต้อง:**
- Revenue ของ ม.ค. ใน chart เพิ่มขึ้น 100,000
- แท่ง "สุทธิ" (Net) = Revenue ใหม่ - Expenses ของเดือนเดียวกัน
- Area สีเขียว (รายรับ) สูงขึ้นเห็นได้ชัด

**แก้กลับ:** col L → `30,000`

---

### ✅ Test 1.6 — Top/Bottom 5 Projects Ranking

**เป้าหมาย:** เช็คว่า ranking เปลี่ยนเมื่อ margin ของโปรเจกต์เปลี่ยน

**ขั้นตอน:**

1. เปิด Dashboard → `/executive` → ดู "Bottom 5 Projects"
2. จดชื่อโปรเจกต์ที่อยู่ Bottom 5 อันดับ 1 (margin ต่ำสุด) → เช่น `MAGIC x ProjectA`
3. เปิด Google Sheet → tab `Income`
4. **เพิ่ม row ใหม่** ด้านล่างสุด:
   - col A: (เลขลำดับถัดไป)
   - col B: `15/04/2026`
   - col E: `MAGIC x ProjectA` (ชื่อเดียวกับ Bottom 5)
   - col L: `500,000` (ยอดสูงมาก)
   - col D: (ใส่ชื่อลูกค้าของโปรเจกต์นั้น)
5. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- `MAGIC x ProjectA` ไม่อยู่ใน Bottom 5 อีกแล้ว (margin ดีขึ้นมาก)
- อาจปรากฏใน Top 5 แทน (ถ้า margin สูงพอ)

**แก้กลับ:** ลบ row ที่เพิ่ม

---

## Page 2: `/projects` — Project Profitability

---

### ✅ Test 2.1 — Project Margin เปลี่ยนตาม Income + Expenses

**เป้าหมาย:** เช็คว่า Margin % ของแต่ละโปรเจกต์คำนวณจาก Income (billedAmount) - Expenses (directCosts)

**ขั้นตอน:**

1. เปิด Dashboard → `/projects`
2. ดูตาราง "กำลังดำเนินงาน" → หาโปรเจกต์ที่มี Margin ~50%
3. จดค่าของโปรเจกต์นั้น:
   - ชื่อ: เช่น `MAGIC x ProjectB`
   - วางบิล (billedAmount): เช่น `฿100,000`
   - ต้นทุน (directCosts): เช่น `฿50,000`
   - Margin: เช่น `50.0%`
4. เปิด Google Sheet → tab `Expenses`
5. **เพิ่ม row ใหม่:**
   - col A: `15/04/2026`
   - col B: `MAGIC x ProjectB` (ชื่อเดียวกัน — **ต้องตรงตัวอักษรเป๊ะ**)
   - col C: `Freelance`
   - col D: `40,000`
6. Dashboard → **Cmd+Shift+R**
7. ดูโปรเจกต์ `MAGIC x ProjectB` ในตาราง

**ผลที่ถูกต้อง:**
- ต้นทุน = `฿90,000` (50,000 + 40,000)
- Margin = `(100,000 - 90,000) / 100,000 × 100` = `10.0%`
- Status ควรเปลี่ยนจาก 🟢 → 🟡 (เพราะ margin < 20%)

**แก้กลับ:** ลบ row Expenses ที่เพิ่ม

---

### ✅ Test 2.2 — Status Badge (ปกติ/เฝ้าระวัง/ขาดทุน)

**เป้าหมาย:** เช็คเงื่อนไข status 3 ระดับ

**ขั้นตอน:**

1. เปิด Dashboard → `/projects`
2. หาโปรเจกต์ที่มี status 🟢 ปกติ (margin ≥ 20%) → จดชื่อ
3. เปิด Google Sheet → tab `Expenses`
4. **เพิ่ม expense rows** ให้โปรเจกต์นั้น จนต้นทุนสูงกว่า revenue:
   - เช่น revenue = 100,000 → เพิ่ม expense 120,000
   - col A: `15/04/2026`
   - col B: ชื่อโปรเจกต์ (ตรงเป๊ะ)
   - col C: `Freelance`
   - col D: `120,000`
5. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง — ทดสอบ 3 ระดับ:**

| เงื่อนไข | Margin % | Status |
|-----------|----------|--------|
| Revenue 100k, Cost 50k | 50% | 🟢 ปกติ |
| Revenue 100k, Cost 85k | 15% | 🟡 เฝ้าระวัง |
| Revenue 100k, Cost 120k | -20% | 🔴 ขาดทุน |

- ปรับ expense ทีละระดับเพื่อเช็คว่า badge เปลี่ยนทั้ง 3 สถานะ
- **Threshold:** ≥ 20% = healthy, 0-20% = warning, < 0% = danger

**แก้กลับ:** ลบ expense rows ที่เพิ่ม

---

### ✅ Test 2.3 — Running vs Closed (BL_Installment_Status)

**เป้าหมาย:** เช็คว่าโปรเจกต์ย้ายจาก "กำลังดำเนินงาน" → "ปิดแล้ว" เมื่อ installments ทุกงวด Paid

**ขั้นตอน:**

1. เปิด Dashboard → `/projects`
2. ดู section "กำลังดำเนินงาน" → เลือกโปรเจกต์ที่มี **installments น้อย** (1-2 งวด)
3. จดชื่อโปรเจกต์ → เช่น `MAGIC x ProjectC`
4. เปิด Google Sheet → tab `BL_Installment_Status`
5. **หาทุก row** ที่ col F (Project_Name) = `MAGIC x ProjectC`
6. **จดค่าเดิม** col C (Status) ของทุก row → เช่น `Pending`, `Pending`
7. แก้ col C ของ **ทุก row** เป็น `Paid`
8. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- `MAGIC x ProjectC` หายจาก section "กำลังดำเนินงาน"
- ปรากฏใน section "ปิดแล้ว" ด้านล่าง
- จำนวน "(X โปรเจกต์)" ของทั้งสอง section เปลี่ยน

**ทดสอบเพิ่ม — เปลี่ยนกลับบางส่วน:**
9. แก้ col C ของ **1 row** กลับเป็น `Pending` (เหลือ 1 งวดยังไม่จ่าย)
10. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- โปรเจกต์กลับมาอยู่ "กำลังดำเนินงาน" อีกครั้ง (แค่ 1 งวด Pending ก็ = running)

**แก้กลับ:** col C ทุก row → ค่าเดิม (`Pending`)

---

### ✅ Test 2.4 — Filter Type + PM

**เป้าหมาย:** เช็คว่า dropdown filter ทำงานถูกต้อง

**ขั้นตอน:**

1. เปิด Dashboard → `/projects`
2. จดจำนวนโปรเจกต์ทั้งหมดใน "กำลังดำเนินงาน" → เช่น 25 โปรเจกต์

**ทดสอบ Type filter:**
3. กด dropdown "ประเภทโปรเจกต์" → เลือก "Retainer"
4. นับจำนวนโปรเจกต์ที่เหลือ
5. เปิด Google Sheet → tab `BL_Master` → นับโปรเจกต์ที่มี BL ≥ 3 ใบ (= Retainer)
6. จำนวนต้องตรงกัน

**ทดสอบ PM filter:**
7. กด dropdown "Project Manager" → เลือก PM คนใดคนหนึ่ง เช่น `Kanyapat Ketnoi`
8. ตาราง + chart ต้องแสดงเฉพาะโปรเจกต์ของ PM นั้น
9. เปิด Google Sheet → tab `BL_Master` → filter col O = `Kanyapat Ketnoi` → นับ unique projects
10. จำนวนต้องตรงกัน

**ทดสอบ filter ร่วมกัน:**
11. เลือก Type = "Retainer" **และ** PM = `Kanyapat Ketnoi`
12. ต้องแสดงเฉพาะโปรเจกต์ที่เป็น Retainer **และ** PM = Kanyapat

**ไม่ต้องแก้ Sheet** — เป็นการเช็ค filter logic ฝั่ง client

---

## Page 3: `/cashflow` — Cash Flow & Financial Health

---

### ✅ Test 3.1 — Cash in Bank (CashFlow page)

**เป้าหมาย:** เช็คว่า KPI "Cash in Bank" บนหน้า cashflow อ่านจาก Cash_Balance เหมือน executive

**ขั้นตอน:**

1. เปิด Dashboard → `/cashflow`
2. จดค่า **"Cash in Bank"** → เช่น `฿2,500,000`
3. เปิด Google Sheet → tab `Cash_Balance`
4. แก้ col B **แถวสุดท้าย** → เช่น `3,500,000`
5. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- Cash in Bank = `฿3,500,000`
- ค่าเดียวกับที่จะแสดงบน `/executive`

**แก้กลับ:** col B → ค่าเดิม

---

### ✅ Test 3.2 — Cash Runway

**เป้าหมาย:** เช็คว่า Cash Runway = Cash in Bank ÷ Monthly Burn Rate

**ขั้นตอน:**

1. เปิด Dashboard → `/cashflow`
2. จดค่า 3 KPI:
   - Cash in Bank = `A` (เช่น `฿2,500,000`)
   - Monthly Burn Rate = `B` (เช่น `฿400,000`)
   - Cash Runway = `C` (เช่น `6.3 เดือน`)
3. คำนวณ: `A / B` = `2,500,000 / 400,000` = `6.25`

**ผลที่ถูกต้อง:**
- `C` ≈ `A / B` (ทศนิยม 1 ตำแหน่ง)

**ทดสอบด้วยการแก้ Cash_Balance:**
4. แก้ Cash_Balance แถวสุดท้าย col B → `1,000,000` (ลดลง)
5. Dashboard → **Cmd+Shift+R**
6. Runway ต้องลดลง → `1,000,000 / 400,000` ≈ `2.5 เดือน`
7. สี KPI card ต้องเปลี่ยน: ≥6 เขียว, ≥3 เหลือง, <3 แดง → `2.5` = **แดง**

**แก้กลับ:** Cash_Balance → ค่าเดิม

---

### ✅ Test 3.3 — Monthly Burn Rate

**เป้าหมาย:** เช็คว่า Burn Rate = ค่าเฉลี่ยรายจ่ายต่อเดือน

**ขั้นตอน:**

1. เปิด Dashboard → `/cashflow`
2. จดค่า **"Monthly Burn Rate"** → เช่น `฿400,000`
3. เปิด Google Sheet → tab `Expenses`
4. **เพิ่ม row ใหม่** ด้านล่างสุด:
   - col A: `15/04/2026`
   - col B: `MAGIC x TestProject`
   - col C: `Office`
   - col D: `200,000`
   - col E: `ทดสอบ burn rate`
5. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- Burn Rate เพิ่มขึ้น (เพราะเฉลี่ยของทุกเดือนสูงขึ้น)
- **วิธีคำนวณ:** รวม expenses ทุก row ÷ จำนวนเดือนที่มี expense

**แก้กลับ:** ลบ row ที่เพิ่ม

---

### ✅ Test 3.4 — Outstanding A/R

**เป้าหมาย:** เช็คว่า Outstanding A/R = ผลรวม amountDue ของ installments ที่ status ≠ Paid

**ขั้นตอน:**

1. เปิด Dashboard → `/cashflow`
2. จดค่า **"Outstanding A/R"** → เช่น `฿850,000`
3. เปิด Google Sheet → tab `BL_Installment_Status`
4. หา row ที่ col C = `Pending` (ยังไม่จ่าย) → จด col I (Amount) → เช่น `27,561`
5. แก้ col C → `Paid`
6. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- Outstanding A/R ลดลง **27,561** (ยอดของ installment ที่ mark Paid)
- เช่น เดิม `฿850,000` → ใหม่ `฿822,439`

**ทดสอบกลับ:**
7. แก้ col C กลับเป็น `Pending`
8. Dashboard → **Cmd+Shift+R**
9. Outstanding A/R ต้องกลับเป็น `฿850,000`

**แก้กลับ:** col C → `Pending`

---

### ✅ Test 3.5 — A/R Aging Chart (4 buckets)

**เป้าหมาย:** เช็คว่า installments จัดเข้า bucket ตามจำนวนวันที่ overdue ถูกต้อง

**ขั้นตอน:**

1. เปิด Dashboard → `/cashflow` → ดู chart "A/R Aging"
2. จดค่าของแต่ละ bucket (hover ที่แท่ง):
   - 0-30 วัน: `฿X`
   - 31-60 วัน: `฿Y`
   - 61-90 วัน: `฿Z`
   - >90 วัน: `฿W`
3. เปิด Google Sheet → tab `BL_Installment_Status`
4. หา row ที่:
   - col C = `Pending` (ยังไม่จ่าย)
   - col H (Due_Date) = วันที่ overdue อยู่ในช่วง 0-30 วัน
5. **จดค่าเดิม** col H → เช่น `01/04/2026`
6. แก้ col H เป็นวันที่ **>90 วันก่อน** → เช่น `15/01/2026`
7. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- แท่ง "0-30 วัน" ลดลง (ยอดของ installment ที่ย้าย)
- แท่ง ">90 วัน" เพิ่มขึ้น (ยอดเดียวกัน)

**ทดสอบ mark Paid:**
8. แก้ col C ของ row เดียวกัน → `Paid`
9. Dashboard → **Cmd+Shift+R**
10. installment นี้ **หายจาก aging chart ทั้งหมด** (Paid = ไม่นับ)

**แก้กลับ:** col H → ค่าเดิม, col C → `Pending`

---

### ✅ Test 3.6 — Cash Forecast Chart

**เป้าหมาย:** เช็คว่า forecast คำนวณจาก Cash + Collections - Burn Rate

**ขั้นตอน:**

1. เปิด Dashboard → `/cashflow` → ดู chart "Cash Forecast"
2. จดค่า projected ของเดือนถัดไป (hover)
3. **Logic:**
   - เดือนปัจจุบัน = Cash in Bank (actual)
   - เดือนถัดไป = Cash + Expected Collections เดือนนั้น - Avg Burn Rate
   - Expected Collections = installments ที่ due เดือนนั้น + status ≠ Paid

**ทดสอบ — เพิ่ม Cash:**
4. เปิด Sheet → tab `Cash_Balance` → แก้แถวสุดท้าย col B เพิ่ม 500,000
5. Dashboard → **Cmd+Shift+R**
6. เส้น forecast ทุกเดือนต้องขยับขึ้น ~500,000

**ทดสอบ — ลด Collections:**
7. เปิด Sheet → tab `BL_Installment_Status`
8. หา installment ที่ due เดือนถัดไป (เช่น พ.ค. 2026) + col C = `Pending`
9. แก้ col C → `Paid`
10. Dashboard → **Cmd+Shift+R**
11. Forecast เดือน พ.ค. ต้องลดลง (collections หายไป)

**แก้กลับ:** Cash_Balance + BL_Installment_Status → ค่าเดิม

---

### ✅ Test 3.7 — Net Cash Outlook (Fixed_Costs + Inflow)

**เป้าหมาย:** เช็คว่า Inflow = pending installments, Fixed Cost = จาก Fixed_Costs tab

**ขั้นตอน:**

**ทดสอบ Fixed Cost (recurring):**
1. เปิด Dashboard → `/cashflow` → ดู chart "Net Cash Outlook"
2. จดค่า fixedCost ของทุกเดือน (hover)
3. เปิด Google Sheet → tab `Fixed_Costs`
4. หา row ที่ col A **ว่าง** (= recurring ทุกเดือน) → จด col C → เช่น `50,000`
5. แก้ col C เป็น `80,000` (เพิ่ม 30,000)
6. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- fixedCost ของ **ทุกเดือน** เพิ่มขึ้น 30,000 (เพราะ recurring)
- Net (= Inflow - Fixed Cost) ลดลง 30,000 ทุกเดือน

**ทดสอบ Fixed Cost (เฉพาะเดือน):**
7. เพิ่ม row ใหม่ใน `Fixed_Costs`:
   - col A: `2026-05`
   - col B: `ทดสอบ`
   - col C: `100,000`
8. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- fixedCost ของ **เฉพาะ พ.ค. 2026** เพิ่มขึ้น 100,000
- เดือนอื่นไม่เปลี่ยน

**ทดสอบ Inflow:**
9. เปิด Sheet → tab `BL_Installment_Status`
10. หา installment ที่ due พ.ค. 2026 + col C = `Pending`
11. แก้ col C → `Paid`
12. Dashboard → **Cmd+Shift+R**
13. Inflow ของ พ.ค. ลดลง (installment ที่ mark Paid ไม่นับเป็น inflow)

**แก้กลับ:** Fixed_Costs → ค่าเดิม + ลบ row ใหม่, BL_Installment_Status → ค่าเดิม

---

### ✅ Test 3.8 — AR Installment Table

**เป้าหมาย:** เช็คว่าตาราง AR แสดง installments ถูกต้อง + เรียงลำดับถูก

**ขั้นตอน:**

**ทดสอบ Status:**
1. เปิด Dashboard → `/cashflow` → ดูตาราง AR ด้านล่าง
2. หา row ที่ status = `Pending` → จด BL number + งวด
3. เปิด Sheet → tab `BL_Installment_Status`
4. หา row ที่ตรง (col A = BL number, col B = installment no)
5. แก้ col C → `Paid`
6. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- สถานะของ row นั้นเปลี่ยนเป็น `Paid`
- Row เลื่อนไปด้านล่างของตาราง (Paid เรียงหลัง Pending/Overdue)

**ทดสอบ Amount:**
7. เปิด Sheet → tab `BL_Installment_Status`
8. หา row ที่ col C = `Pending` → จดค่า col I (Amount) → เช่น `27,561`
9. แก้ col I → `50,000`
10. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- ยอดเงินในตาราง AR เปลี่ยนจาก `฿27,561` → `฿50,000`

**ทดสอบ Sorting:**
11. เช็คว่าตารางเรียง: Overdue ก่อน → Pending → Paid
12. ใน Overdue/Pending: เรียงตาม daysOverdue มากสุดก่อน

**แก้กลับ:** col C + col I → ค่าเดิม

---

## Page 4: `/expenses` — Expense Deep Dive

---

### ✅ Test 4.1 — Expense Donut Chart (สัดส่วนตามหมวดหมู่)

**เป้าหมาย:** เช็คว่า Donut chart แสดงสัดส่วน expense ตาม category ถูกต้อง

**ขั้นตอน:**

**ทดสอบ — เพิ่ม category ที่มีอยู่:**
1. เปิด Dashboard → `/expenses` → ดู Donut chart
2. จดสัดส่วน % ของ category "Travel" → เช่น `8.5%`
3. เปิด Google Sheet → tab `Expenses`
4. **เพิ่ม row ใหม่:**
   - col A: `15/04/2026`
   - col B: `MAGIC x TestProject`
   - col C: `Travel`
   - col D: `100,000` (ยอดสูง)
5. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- สัดส่วน "Travel" ใน Donut เพิ่มขึ้นอย่างชัดเจน

**ทดสอบ — เพิ่ม category ใหม่:**
6. เพิ่ม row อีก:
   - col A: `15/04/2026`
   - col B: `MAGIC x TestProject`
   - col C: `NewCategory` (ชื่อใหม่ที่ยังไม่มี)
   - col D: `50,000`
7. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- Donut chart มีชิ้นใหม่ "NewCategory" ปรากฏ
- Legend แสดงชื่อ "NewCategory"

**แก้กลับ:** ลบ 2 rows ที่เพิ่ม

---

### ✅ Test 4.2 — Budget vs Actual Chart

**เป้าหมาย:** เช็คว่า Budget อ่านจาก tab Budget, Actual อ่านจาก Expenses (แยกตาม category)

**ขั้นตอน:**

**ทดสอบ Budget:**
1. เปิด Dashboard → `/expenses` → ดู chart "Budget vs Actual"
2. หา category ที่ Budget > Actual → จดค่า Budget → เช่น `Freelance: ฿200,000`
3. เปิด Google Sheet → tab `Budget`
4. หา row ที่ col A = `Freelance` → จดค่า col C → `200,000`
5. แก้ col C → `100,000` (ลด budget)
6. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- แท่ง Budget ของ Freelance ลดลงจาก 200k → 100k
- ถ้า Actual > 100k → แสดง over budget (variance < 0)

**ทดสอบ Actual:**
7. เปิด Google Sheet → tab `Expenses`
8. เพิ่ม row:
   - col A: `15/04/2026`
   - col B: `MAGIC x TestProject`
   - col C: `Freelance` (category เดียวกัน — **ตรงตัวอักษรเป๊ะ** กับ Budget tab)
   - col D: `80,000`
9. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- แท่ง Actual ของ "Freelance" เพิ่มขึ้น 80,000
- Variance = Budget - Actual ลดลง

**แก้กลับ:** Budget col C → `200,000`, ลบ Expenses row

---

### ✅ Test 4.3 — Anomaly Detection (> 2σ)

**เป้าหมาย:** เช็คว่ารายจ่ายที่สูงผิดปกติ (> avg + 2×std ของ category) ปรากฏในตาราง Anomaly

**ขั้นตอน:**

1. เปิด Dashboard → `/expenses` → ดูตาราง "Anomaly"
2. จดจำนวน anomaly ปัจจุบัน → เช่น 3 rows
3. เปิด Google Sheet → tab `Expenses`
4. หา category ที่มีหลาย rows (เช่น `Office`) → ดูยอดเฉลี่ย
   - เช่น Office มี 10 rows, ค่าเฉลี่ย ~5,000 บาท
5. **เพิ่ม row ใหม่** ที่ยอดสูงมาก (> avg + 2σ):
   - col A: `15/04/2026`
   - col B: `MAGIC x TestProject`
   - col C: `Office`
   - col D: `50,000` (10 เท่าของค่าเฉลี่ย — ต้องผ่าน threshold แน่นอน)
   - col E: `ทดสอบ anomaly detection`
6. Dashboard → **Cmd+Shift+R**

**ผลที่ถูกต้อง:**
- ตาราง Anomaly มี row ใหม่ปรากฏ
- แสดง: date `15/04/2026`, project `MAGIC x TestProject`, category `Office`, amount `฿50,000`
- deviation % สูง (เช่น `+900%`)

**ทดสอบ — ยอดไม่ผิดปกติ:**
7. เพิ่ม row อีก:
   - col C: `Office`
   - col D: `5,000` (ใกล้เคียงค่าเฉลี่ย)
8. Dashboard → **Cmd+Shift+R**
9. Row นี้ **ไม่** ปรากฏในตาราง Anomaly (ไม่เกิน 2σ)

**แก้กลับ:** ลบ rows ที่เพิ่ม

---

## Cross-Page: Period Picker

---

### ✅ Test 5.1 — Date Range Filter

**เป้าหมาย:** เช็คว่า period picker กรอง data ตาม date range ที่เลือก

**ขั้นตอน:**

**ทดสอบ 1 — เลือกเดือนเดียว:**
1. เปิด Dashboard → `/executive`
2. กด Period Picker → เลือก **"เม.ย. 2026"** (เดือนเดียว)
3. URL ต้องเปลี่ยน: `?from=2026-04&to=2026-04`

**ผลที่ถูกต้อง:**
- Revenue = ผลรวม Income ที่มี date ใน เม.ย. 2026 เท่านั้น
- Expenses = ผลรวม Expenses ที่มี date ใน เม.ย. 2026 เท่านั้น
- Trend chart แสดงเฉพาะเดือนรอบๆ เม.ย. 2026

**ทดสอบ 2 — data นอก period ไม่แสดง:**
4. เปิด Google Sheet → tab `Expenses`
5. เพิ่ม row:
   - col A: `15/03/2026` (มีนาคม — อยู่ **นอก** period เม.ย.)
   - col B: `MAGIC x TestProject`
   - col C: `Office`
   - col D: `999,999`
6. Dashboard → **Cmd+Shift+R** (ยังเลือก period เม.ย.)

**ผลที่ถูกต้อง:**
- Expenses **ไม่** เพิ่มขึ้น 999,999 (เพราะ date มี.ค. อยู่นอก period เม.ย.)
- เปลี่ยน period เป็น "ปีนี้" → Expenses ต้องเพิ่มขึ้น 999,999

**ทดสอบ 3 — Presets:**
7. กด "เดือนนี้" → ต้องแสดง เม.ย. 2026
8. กด "ปีนี้" → ต้องแสดง ม.ค. - เม.ย. 2026
9. กด "ทั้งหมด" → ต้องแสดงทุกเดือนที่มี data

**ทดสอบ 4 — Period ส่งผลข้าม pages:**
10. เลือก period "ม.ค. 2026" บน `/executive`
11. Navigate ไป `/projects` → ข้อมูลต้อง filter ตาม ม.ค. เหมือนกัน
12. Navigate ไป `/expenses` → ข้อมูลต้อง filter ตาม ม.ค. เหมือนกัน

**แก้กลับ:** ลบ Expenses row ที่เพิ่ม, reset period picker เป็น "ปีนี้"

---

## Summary: Quick Reference

| # | Test | Sheet Tab | ต้องแก้ | หน้า Dashboard |
|---|------|-----------|---------|----------------|
| 1.1 | Revenue KPI | Income | col L | `/executive` |
| 1.2 | Expenses KPI | Expenses | col D | `/executive` |
| 1.3 | Net Profit calculation | — | ไม่แก้ | `/executive` |
| 1.4 | Cash in Bank | Cash_Balance | col B (last row) | `/executive` |
| 1.5 | Trend Chart | Income | col L | `/executive` |
| 1.6 | Top/Bottom 5 | Income | เพิ่ม row | `/executive` |
| 2.1 | Project Margin | Expenses | เพิ่ม row | `/projects` |
| 2.2 | Status Badge | Expenses | col D | `/projects` |
| 2.3 | Running/Closed | BL_Installment_Status | col C | `/projects` |
| 2.4 | Filter Type+PM | — | ไม่แก้ | `/projects` |
| 3.1 | Cash in Bank | Cash_Balance | col B | `/cashflow` |
| 3.2 | Cash Runway | Cash_Balance | col B | `/cashflow` |
| 3.3 | Burn Rate | Expenses | เพิ่ม row | `/cashflow` |
| 3.4 | Outstanding A/R | BL_Installment_Status | col C | `/cashflow` |
| 3.5 | A/R Aging | BL_Installment_Status | col H | `/cashflow` |
| 3.6 | Cash Forecast | Cash_Balance + BL_Installment_Status | col B + col C | `/cashflow` |
| 3.7 | Net Cash Outlook | Fixed_Costs + BL_Installment_Status | col C | `/cashflow` |
| 3.8 | AR Table | BL_Installment_Status | col C + col I | `/cashflow` |
| 4.1 | Expense Donut | Expenses | เพิ่ม row | `/expenses` |
| 4.2 | Budget vs Actual | Budget + Expenses | col C + เพิ่ม row | `/expenses` |
| 4.3 | Anomaly | Expenses | เพิ่ม row (ยอดสูง) | `/expenses` |
| 5.1 | Period Picker | Expenses | เพิ่ม row (ต่างเดือน) | ทุกหน้า |
