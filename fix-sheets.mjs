import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// ===== Mock Data Definitions =====

const PROJECTS = [
  { name: "MAGIC x PMW Steel Building Jan-Dec 2026", client: "บริษัท โปรเฟสชั่นนอล เมททอล เวิร์ค จำกัด", taxId: "115555012747", pm: "Kanyapat Ketnoi", type: "Retainer" },
  { name: "MAGIC x STADA Thailand D Throlis Jan-June 2026", client: "บริษัท สตาดา(ประเทศไทย) จำกัด", taxId: "105541078422", pm: "Kanyapat Ketnoi", type: "Project-based" },
  { name: "MAGIC x Bluekoff Social Media 2026", client: "บริษัท บลูคอฟ จำกัด", taxId: "105563089211", pm: "Tassaphon Boom", type: "Retainer" },
  { name: "MAGIC x TrueMove H Campaign Q1", client: "บริษัท ทรู คอร์ปอเรชั่น จำกัด (มหาชน)", taxId: "107537000289", pm: "Tassaphon Boom", type: "Project-based" },
  { name: "MAGIC x SCB Julius Baer Launch", client: "บริษัท เอสซีบี จูเลียส แบร์ จำกัด", taxId: "105564012345", pm: "Naphat Siri", type: "Project-based" },
  { name: "MAGIC x CP ALL Convenience Fest", client: "บริษัท ซีพี ออลล์ จำกัด (มหาชน)", taxId: "107533000037", pm: "Naphat Siri", type: "Project-based" },
  { name: "MAGIC x Minor Food Rebranding", client: "บริษัท ไมเนอร์ ฟู้ด กรุ๊ป จำกัด (มหาชน)", taxId: "107554000711", pm: "Kanyapat Ketnoi", type: "Project-based" },
  { name: "MAGIC x Ananda Urban Living Q2", client: "บริษัท อนันดา ดีเวลลอปเม้นท์ จำกัด (มหาชน)", taxId: "107549000524", pm: "Tassaphon Boom", type: "Project-based" },
];

const CATEGORIES = ["Payroll", "Media Buying", "Freelance", "Software Subscriptions", "Office & Admin", "Travel", "Food", "Other"];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(y, m, d) {
  return `${d}/${m}/${y}`;
}

function formatDateISO(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ===== Generate Mock Income Data =====
function generateIncomeData() {
  const rows = [];
  let seq = 1;
  const statuses = ["ชำระแล้ว", "รอเก็บเงิน"];

  for (let y = 2025; y <= 2026; y++) {
    const endMonth = y === 2026 ? 3 : 12;
    const startMonth = y === 2025 ? 4 : 1;
    for (let m = startMonth; m <= endMonth; m++) {
      // 2-3 invoices per month
      const count = randomBetween(2, 3);
      for (let i = 0; i < count; i++) {
        const proj = PROJECTS[randomBetween(0, PROJECTS.length - 1)];
        const day = randomBetween(1, 28);
        const baseAmount = randomBetween(30, 500) * 1000;
        const vat = Math.round(baseAmount * 0.07);
        const total = baseAmount + vat;
        const invNo = `INV${y}${String(m).padStart(2, "0")}${String(seq).padStart(3, "0")}`;
        const status = (y === 2026 && m >= 2) ? statuses[randomBetween(0, 1)] : "ชำระแล้ว";

        rows.push([
          seq,
          invNo,
          formatDate(y, m, day),
          proj.client,
          proj.name,
          proj.taxId,
          "สำนักงานใหญ่",
          baseAmount,
          vat,
          total,
          `SYS${String(seq).padStart(3, "0")}`,
          `REF${String(seq).padStart(3, "0")}`,
          seq <= 5 ? `DEP${String(seq).padStart(3, "0")}` : "",
          status,
          proj.pm,
        ]);
        seq++;
      }
    }
  }
  return rows;
}

// ===== Generate Mock Expenses Data =====
function generateExpenseData() {
  const rows = [];
  const descriptions = {
    "Payroll": ["เงินเดือนพนักงานประจำ", "เงินเดือน Part-time", "โบนัส Q1"],
    "Media Buying": ["ค่าโฆษณา Facebook Ads", "ค่าโฆษณา Google Ads", "ค่าโฆษณา TikTok Ads", "ค่า LINE OA Broadcast"],
    "Freelance": ["ค่าจ้างตากล้อง", "ค่าจ้างกราฟิกดีไซเนอร์", "ค่าจ้าง Influencer", "ค่าจ้างตัดต่อวิดีโอ"],
    "Software Subscriptions": ["Adobe Creative Cloud", "Canva Pro Team", "Hootsuite Enterprise", "Figma Business"],
    "Office & Admin": ["ค่าเช่าออฟฟิศ", "ค่าไฟฟ้า", "ค่าอินเทอร์เน็ต", "ค่าน้ำประปา"],
    "Travel": ["ค่าแท็กซี่ไปพบลูกค้า", "ค่าน้ำมันรถ", "ค่าที่พัก ต่างจังหวัด", "ค่าตั๋วเครื่องบิน"],
    "Food": ["ค่าอาหารกลางวันทีม", "ค่ากาแฟประชุม", "ค่าอาหาร OT", "สวัสดิการอาหาร"],
    "Other": ["ค่าเบ็ดเตล็ด", "ค่าของขวัญลูกค้า", "ค่าพิมพ์เอกสาร", "ค่าจัดส่งพัสดุ"],
  };
  const avgAmounts = {
    "Payroll": [80000, 150000],
    "Media Buying": [15000, 80000],
    "Freelance": [8000, 50000],
    "Software Subscriptions": [2000, 15000],
    "Office & Admin": [5000, 30000],
    "Travel": [1000, 8000],
    "Food": [500, 5000],
    "Other": [500, 3000],
  };

  for (let y = 2025; y <= 2026; y++) {
    const endMonth = y === 2026 ? 3 : 12;
    const startMonth = y === 2025 ? 4 : 1;
    for (let m = startMonth; m <= endMonth; m++) {
      // 4-6 expenses per month
      const count = randomBetween(4, 6);
      for (let i = 0; i < count; i++) {
        const cat = CATEGORIES[randomBetween(0, CATEGORIES.length - 1)];
        const proj = PROJECTS[randomBetween(0, PROJECTS.length - 1)];
        const day = randomBetween(1, 28);
        const [minAmt, maxAmt] = avgAmounts[cat];
        let amount = randomBetween(minAmt, maxAmt);

        // Create 3 anomalous entries
        if ((y === 2026 && m === 1 && i === 0) || (y === 2025 && m === 9 && i === 0) || (y === 2026 && m === 3 && i === 0)) {
          amount = amount * 4; // 4x normal
        }

        const desc = descriptions[cat][randomBetween(0, descriptions[cat].length - 1)];
        rows.push([
          formatDateISO(y, m, day),
          proj.name,
          cat,
          amount,
          desc,
          "", // no slip image for mock
        ]);
      }
    }
  }
  return rows;
}

// ===== Generate Invoice Installments =====
function generateInstallments(incomeRows) {
  const rows = [];
  // Pick ~15 invoices and create installments
  const selectedInvoices = incomeRows.filter((_, i) => i % 3 === 0).slice(0, 15);

  for (const inv of selectedInvoices) {
    const invNo = inv[1];
    const total = parseFloat(inv[9]) || 0;
    const numInstallments = randomBetween(1, 3);
    const perInstallment = Math.round(total / numInstallments);

    for (let inst = 1; inst <= numInstallments; inst++) {
      // Parse the date from the invoice
      const dateParts = inv[2].split("/");
      const invDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      const dueDate = new Date(invDate);
      dueDate.setDate(dueDate.getDate() + 30 * inst);

      const now = new Date();
      const daysDiff = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      let status;
      if (inv[13] === "ชำระแล้ว") {
        status = "Paid";
      } else if (daysDiff > 0) {
        status = "Overdue";
      } else {
        status = "Pending";
      }

      const reminderSent = status === "Paid" ? "TRUE" : "FALSE";

      rows.push([
        invNo,
        `${inst}/${numInstallments}`,
        perInstallment,
        formatDateISO(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate()),
        status,
        reminderSent,
      ]);
    }
  }
  return rows;
}

// ===== Generate Cash Balance (12 months) =====
function generateCashBalance() {
  const rows = [];
  let balance = 450000;
  for (let y = 2025; y <= 2026; y++) {
    const endMonth = y === 2026 ? 3 : 12;
    const startMonth = y === 2025 ? 4 : 1;
    for (let m = startMonth; m <= endMonth; m++) {
      const lastDay = new Date(y, m, 0).getDate();
      balance += randomBetween(-50000, 80000);
      balance = Math.max(200000, balance); // floor at 200K
      rows.push([
        formatDateISO(y, m, lastDay),
        balance,
        `ยอดคงเหลือสิ้นเดือน ${m}/${y}`,
      ]);
    }
  }
  return rows;
}

// ===== Main =====
async function main() {
  console.log("🔧 MAGIC ACCOUNTING — Seed Mock Data\n");

  // 1. Check existing tabs
  const sheetMeta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties.title",
  });
  const existingTabs = sheetMeta.data.sheets?.map((s) => s.properties?.title) || [];

  // Create missing tabs
  const requiredTabs = ["Income", "Expenses", "Invoice_Installments", "Projects_Master", "Cash_Balance", "Budget"];
  const tabsToCreate = requiredTabs.filter((t) => !existingTabs.includes(t));
  if (tabsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: tabsToCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    console.log(`✅ Created tabs: ${tabsToCreate.join(", ")}`);
  }

  // 2. Clear and seed Income
  console.log("\n--- Income ---");
  const incomeHeaders = [
    "ลำดับที่", "เลขที่เอกสาร", "วัน/เดือน/ปี", "ชื่อลูกค้า", "ชื่อโปรเจค",
    "เลขผู้เสียภาษี", "สำนักงานใหญ่/สาขา", "มูลค่า", "ภาษีมูลค่าเพิ่ม",
    "ยอดรวมสุทธิ", "เอกสารอ้างอิงในระบบ", "เลขที่อ้างอิง",
    "เอกสารอ้างอิงรับมัดจำ", "สถานะ", "พนักงานขาย",
  ];
  const incomeData = generateIncomeData();
  const allIncome = [incomeHeaders, ...incomeData];
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "'Income'!A:Z" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Income'!A1:O${allIncome.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allIncome },
  });
  console.log(`  ✅ ${incomeData.length} rows seeded`);

  // 3. Clear and seed Expenses
  console.log("\n--- Expenses ---");
  const expenseHeaders = ["วันที่", "โปรเจค", "หมวดหมู่", "จำนวนเงิน", "รายละเอียด", "รูปสลิป"];
  const expenseData = generateExpenseData();
  const allExpenses = [expenseHeaders, ...expenseData];
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "'Expenses'!A:Z" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Expenses'!A1:F${allExpenses.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allExpenses },
  });
  console.log(`  ✅ ${expenseData.length} rows seeded`);

  // 4. Clear and seed Invoice_Installments
  console.log("\n--- Invoice_Installments ---");
  const instHeaders = ["Invoice_No", "Installment_No", "Amount_Due", "Due_Date", "Status", "Reminder_Sent"];
  const instData = generateInstallments(incomeData);
  const allInst = [instHeaders, ...instData];
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "'Invoice_Installments'!A:Z" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Invoice_Installments'!A1:F${allInst.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allInst },
  });
  console.log(`  ✅ ${instData.length} rows seeded`);

  // 5. Fill Projects_Master
  console.log("\n--- Projects_Master ---");
  const projHeaders = ["Project_Name", "Client_Name", "Type", "Project_Manager", "Contract_Value"];
  const projData = PROJECTS.map((p) => {
    const totalRevenue = incomeData
      .filter((r) => r[4] === p.name)
      .reduce((sum, r) => sum + (parseFloat(r[9]) || 0), 0);
    return [p.name, p.client, p.type, p.pm, totalRevenue || randomBetween(100, 800) * 1000];
  });
  const allProj = [projHeaders, ...projData];
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "'Projects_Master'!A:Z" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Projects_Master'!A1:E${allProj.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allProj },
  });
  console.log(`  ✅ ${projData.length} projects seeded`);

  // 6. Clear and seed Cash_Balance (12 months)
  console.log("\n--- Cash_Balance ---");
  const cashHeaders = ["วันที่", "ยอดเงินในบัญชี", "หมายเหตุ"];
  const cashData = generateCashBalance();
  const allCash = [cashHeaders, ...cashData];
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "'Cash_Balance'!A:Z" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Cash_Balance'!A1:C${allCash.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allCash },
  });
  console.log(`  ✅ ${cashData.length} months seeded`);

  // 7. Seed Budget (keep existing or reset)
  console.log("\n--- Budget ---");
  const budgetHeaders = ["หมวดหมู่ย่อย", "แผนก", "งบประมาณรายเดือน", "หมายเหตุ"];
  const budgetData = [
    ["Payroll", "Admin", 150000, "เงินเดือนพนักงาน"],
    ["Media Buying", "Marketing", 80000, "ค่าซื้อสื่อโฆษณา"],
    ["Freelance", "Creative", 50000, "ค่าจ้าง Freelance"],
    ["Software Subscriptions", "Admin", 15000, "ค่า Tool ต่างๆ"],
    ["Office & Admin", "Admin", 25000, "ค่าเช่า ค่าไฟ ค่าน้ำ"],
    ["Travel", "Marketing", 10000, "ค่าเดินทาง"],
    ["Food", "Admin", 8000, "ค่าอาหาร สวัสดิการ"],
    ["Other", "Admin", 5000, "เบ็ดเตล็ด"],
  ];
  const allBudget = [budgetHeaders, ...budgetData];
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "'Budget'!A:Z" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Budget'!A1:D${allBudget.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allBudget },
  });
  console.log(`  ✅ ${budgetData.length} categories seeded`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Mock data seeded successfully!");
  console.log(`  Income: ${incomeData.length} invoices`);
  console.log(`  Expenses: ${expenseData.length} entries`);
  console.log(`  Installments: ${instData.length} entries`);
  console.log(`  Projects: ${projData.length} projects`);
  console.log(`  Cash Balance: ${cashData.length} months`);
  console.log(`  Budget: ${budgetData.length} categories`);
}

main().catch(console.error);
