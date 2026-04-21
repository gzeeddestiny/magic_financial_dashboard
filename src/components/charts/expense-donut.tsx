"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExpenseByCategory } from "@/types";

const COLORS = [
  "oklch(0.7 0.2 290)",   // purple (brand)
  "oklch(0.65 0.18 320)", // magenta
  "oklch(0.8 0.15 85)",   // amber
  "oklch(0.65 0.2 25)",   // red
  "oklch(0.72 0.19 150)", // green
  "oklch(0.6 0.15 250)",  // blue
  "oklch(0.55 0.15 340)", // pink
  "oklch(0.5 0.08 285)",  // muted purple
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-lg px-4 py-3 shadow-xl border border-border">
      <p className="text-base font-semibold">{d.category}</p>
      <p className="text-base">฿{d.amount.toLocaleString()} ({d.percentage.toFixed(1)}%)</p>
    </div>
  );
};

export function ExpenseDonutChart({ data }: { data: ExpenseByCategory[] }) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Expense by Category</CardTitle>
        <p className="text-base text-muted-foreground">สัดส่วนรายจ่ายตามหมวดหมู่</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-[250px] w-[250px] shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="amount"
                >
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold">฿{(total / 1000).toFixed(0)}K</span>
              <span className="text-sm text-muted-foreground">ทั้งหมด</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            {data.slice(0, 8).map((d, i) => (
              <div key={d.category} className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-base flex-1 truncate">{d.category}</span>
                <span className="text-base font-medium tabular-nums text-muted-foreground">{d.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
