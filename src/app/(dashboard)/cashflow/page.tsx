import { getCashFlowKpis, getArAging, getCashForecast, getNetCashOutlook, getArInstallments, type DateRange } from "@/actions/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ArAgingChart } from "@/components/charts/ar-aging";
import { CashForecastChart } from "@/components/charts/cash-forecast";
import { NetCashOutlookChart } from "@/components/charts/net-cash-outlook";
import { ArInstallmentTable } from "@/components/dashboard/ar-installment-table";
import { formatCurrency } from "@/lib/format";
import { Landmark, Clock, Flame, FileWarning } from "lucide-react";

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range: DateRange | undefined =
    sp.from && sp.to ? { from: sp.from, to: sp.to } : undefined;

  const [kpis, arAging, cashForecast, netCashOutlook, arInstallments] = await Promise.all([
    getCashFlowKpis(range),
    getArAging(range),
    getCashForecast(range),
    getNetCashOutlook(),
    getArInstallments(),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cash Flow & Financial Health</h1>
        <p className="text-base text-muted-foreground mt-1">
          กระแสเงินสดและสภาพคล่อง — CFO ใช้ประเมินความเสี่ยง
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          title="Cash in Bank"
          value={`฿${formatCurrency(kpis.cashInBank)}`}
          icon={<Landmark className="h-5 w-5" />}
          variant="default"
          info="ยอดเงินในบัญชีล่าสุด — อ่านจากแท็บ Cash_Balance แถวล่าสุด คอลัมน์ Balance (C)"
          description="ยอดล่าสุดในบัญชี"
        />
        <KpiCard
          title="Cash Runway"
          value={`${kpis.cashRunway.toFixed(1)} เดือน`}
          icon={<Clock className="h-5 w-5" />}
          variant={kpis.cashRunway >= 6 ? "profit" : kpis.cashRunway >= 3 ? "warning" : "loss"}
          info="จำนวนเดือนที่อยู่ได้ = Cash in Bank ÷ Burn Rate เฉลี่ย — เขียว ≥6, เหลือง ≥3, แดง <3"
          description="จำนวนเดือนที่อยู่ได้"
        />
        <KpiCard
          title="Monthly Burn Rate"
          value={`฿${formatCurrency(Math.round(kpis.monthlyBurnRate))}`}
          icon={<Flame className="h-5 w-5" />}
          variant="warning"
          info="รายจ่ายเฉลี่ยต่อเดือน = รายจ่ายรวมในช่วงที่เลือก ÷ จำนวนเดือน"
          description="ค่าเฉลี่ย/เดือน"
        />
        <KpiCard
          title="Outstanding A/R"
          value={`฿${formatCurrency(kpis.outstandingAR)}`}
          icon={<FileWarning className="h-5 w-5" />}
          variant={kpis.outstandingAR > 0 ? "warning" : "profit"}
          info="ยอดลูกหนี้ค้างรับ — คำนวณจาก BL installments ที่ยังไม่ได้รับเงิน (status ≠ Paid)"
          description="หนี้ค้างรับ"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ArAgingChart data={arAging} />
        <CashForecastChart data={cashForecast} />
      </div>

      {/* Net Cash Outlook */}
      <NetCashOutlookChart data={netCashOutlook} />

      {/* AR Installment Table — mark paid */}
      <ArInstallmentTable data={arInstallments} />
    </div>
  );
}
