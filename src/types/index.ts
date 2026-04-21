// ===== Google Sheets Tab Schemas =====

export interface Income {
  rowNumber: number;        // A: ลำดับที่
  invoiceNo: string;        // B: เลขที่เอกสาร
  date: string;             // C: วัน/เดือน/ปี
  clientName: string;       // D: ชื่อลูกค้า
  projectName: string;      // E: ชื่อโปรเจค
  taxId: string;            // F: เลขผู้เสียภาษี
  branchType: string;       // G: สำนักงานใหญ่/สาขา
  amount: number;           // H: มูลค่า
  vat: number;              // I: ภาษีมูลค่าเพิ่ม
  totalAmount: number;      // J: ยอดรวมสุทธิ
  systemRef: string;        // K: เอกสารอ้างอิงในระบบ
  invoiceRef: string;       // L: เลขที่อ้างอิง
  depositRef: string;       // M: เอกสารอ้างอิงรับมัดจำ
  status: string;           // N: สถานะ (รอเก็บเงิน / ชำระแล้ว)
  salesperson: string;      // O: พนักงานขาย
}

export interface Installment {
  invoiceNo: string;
  installmentNo: string;
  amountDue: number;
  dueDate: string;
  status: "Pending" | "Paid" | "Overdue";
  reminderSent: boolean;
  blNumber?: string;
  projectName?: string;
  clientName?: string;
}

export interface Expense {
  date: string;
  projectName: string;
  category: string;
  amount: number;
  description: string;
  imageUrl: string;
}

export interface Project {
  projectName: string;
  clientName: string;
  type: "Retainer" | "Project-based";
  projectManager: string;
  contractValue: number;
}

// ===== Dashboard Data Types =====

export interface KpiData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  cashInBank: number;
  lastMonthMargin: number;
  lastMonthRevenue: number;
  lastMonthExpenses: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface ProjectProfitability {
  projectName: string;
  clientName: string;
  projectType: string;
  projectManager: string;
  contractValue: number;
  blContractValue: number;
  billedAmount: number;
  directCosts: number;
  margin: number;
  marginPercent: number;
  status: "healthy" | "warning" | "danger";
  projectStatus: "running" | "closed";
}

export interface ArAgingBucket {
  bucket: string;
  amount: number;
  count: number;
}

export interface CashForecast {
  month: string;
  projected: number;
  actual?: number;
}

export interface NetCashOutlook {
  month: string;       // Thai short label e.g. "พ.ค. 26"
  monthKey: string;    // "YYYY-MM"
  inflow: number;      // pending installments due this month
  fixedCost: number;   // fixed costs from Fixed_Costs tab
  net: number;         // inflow - fixedCost
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExpenseAnomaly {
  date: string;
  projectName: string;
  category: string;
  amount: number;
  description: string;
  imageUrl: string;
  deviation: number;
}

// ===== OCR Types =====

export interface OcrResult {
  date: string;
  amount: number;
  category: string;
  description: string;
}

// ===== Form Types =====

export interface ExpenseFormData {
  date: string;
  projectName: string;
  category: string;
  amount: number;
  description: string;
  imageFile?: File;
}
