import { getExpenseByCategory, getBudgetVsActual, getRecentAnomalies, type DateRange } from "@/actions/dashboard";
import { ExpenseDonutChart } from "@/components/charts/expense-donut";
import { BudgetActualChart } from "@/components/charts/budget-actual";
import { AnomalyTable } from "@/components/charts/anomaly-table";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range: DateRange | undefined =
    sp.from && sp.to ? { from: sp.from, to: sp.to } : undefined;

  const [categoryData, budgetData, anomalies] = await Promise.all([
    getExpenseByCategory(range),
    getBudgetVsActual(range),
    getRecentAnomalies(range),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expense Deep Dive</h1>
        <p className="text-base text-muted-foreground mt-1">
          ชำแหละรายจ่าย — ดูว่าเงินรั่วไหลไปกับอะไร
        </p>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ExpenseDonutChart data={categoryData} />
        <BudgetActualChart data={budgetData} />
      </div>

      {/* Anomalies Table */}
      <AnomalyTable data={anomalies} />
    </div>
  );
}
