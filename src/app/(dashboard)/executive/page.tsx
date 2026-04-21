import { getKpiData, getMonthlyTrends, getProjectProfitability, type DateRange } from "@/actions/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueExpenseTrend } from "@/components/charts/revenue-expense-trend";
import { ProjectRanking } from "@/components/charts/project-ranking";
import { formatCurrency } from "@/lib/format";
import { DollarSign, TrendingDown, TrendingUp, Landmark } from "lucide-react";

export default async function ExecutiveSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range: DateRange | undefined =
    sp.from && sp.to ? { from: sp.from, to: sp.to } : undefined;

  const [kpi, trends, projects] = await Promise.all([
    getKpiData(range),
    getMonthlyTrends(range),
    getProjectProfitability(range),
  ]);

  const marginChange = kpi.profitMargin - kpi.lastMonthMargin;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Summary</h1>
        <p className="text-base text-muted-foreground mt-1">
          ภาพรวมสถานะการเงิน — อัพเดตจาก Google Sheet
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          title="Total Revenue (YTD)"
          value={`฿${formatCurrency(kpi.totalRevenue)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="profit"
          info="ยอดรับเงินสะสมในช่วงที่เลือก — รวมจากแท็บ Income คอลัมน์ยอดรวมสุทธิ (J) เฉพาะสถานะ ชำระแล้ว"
          trend={
            kpi.lastMonthRevenue > 0
              ? { value: ((kpi.totalRevenue - kpi.lastMonthRevenue) / kpi.lastMonthRevenue) * 10, isPositive: kpi.totalRevenue > kpi.lastMonthRevenue }
              : undefined
          }
          description="เทียบเดือนที่แล้ว"
        />
        <KpiCard
          title="Total Expenses (YTD)"
          value={`฿${formatCurrency(kpi.totalExpenses)}`}
          icon={<TrendingDown className="h-5 w-5" />}
          variant="loss"
          info="รายจ่ายสะสมในช่วงที่เลือก — รวมจากแท็บ Expenses คอลัมน์ Amount (E) ทุกหมวดหมู่"
          description="รายจ่ายสะสมปีนี้"
        />
        <KpiCard
          title="Net Profit & Margin"
          value={`฿${formatCurrency(kpi.netProfit)}`}
          icon={<DollarSign className="h-5 w-5" />}
          variant={kpi.netProfit >= 0 ? "profit" : "loss"}
          info="กำไรสุทธิ = รายรับ − รายจ่าย · Margin % = (กำไรสุทธิ ÷ รายรับ) × 100"
          trend={{ value: marginChange, isPositive: marginChange >= 0 }}
          description={`Margin ${kpi.profitMargin.toFixed(1)}%`}
        />
        <KpiCard
          title="Cash in Bank"
          value={`฿${formatCurrency(kpi.cashInBank)}`}
          icon={<Landmark className="h-5 w-5" />}
          variant="default"
          info="ยอดเงินในบัญชีล่าสุด — อ่านจากแท็บ Cash_Balance แถวล่าสุด คอลัมน์ Balance (C)"
          description="ยอดล่าสุด"
        />
      </div>

      {/* Revenue vs Expense Trend */}
      <RevenueExpenseTrend data={trends} />

      {/* Top / Bottom Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProjectRanking data={projects} variant="top" />
        <ProjectRanking data={projects} variant="bottom" />
      </div>
    </div>
  );
}
