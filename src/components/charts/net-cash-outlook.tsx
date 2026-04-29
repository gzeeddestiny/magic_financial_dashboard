"use client";

import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NetCashOutlook } from "@/types";

// ─── Tooltip ───

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-muted-foreground">{p.name}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums" style={{ color: p.color }}>
              {p.value < 0 ? "-" : ""}฿{Math.abs(p.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───

export function NetCashOutlookChart({ data }: { data: NetCashOutlook[] }) {
  const totalInflow = data.reduce((s, d) => s + d.inflow, 0);
  const totalFixed = data.reduce((s, d) => s + d.fixedCost, 0);
  const totalNet = totalInflow - totalFixed;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Net Cash Outlook</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              รายรับที่คาดในอนาคต vs Fixed Cost — 6 เดือนข้างหน้า
            </p>
          </div>

          {/* Summary pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
              รับ ฿{(totalInflow / 1000).toFixed(0)}K
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-400">
              Fixed ฿{(totalFixed / 1000).toFixed(0)}K
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                totalNet >= 0
                  ? "bg-green-500/10 text-green-700"
                  : "bg-red-500/10 text-red-700"
              }`}
            >
              สุทธิ {totalNet < 0 ? "-" : ""}฿{(Math.abs(totalNet) / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="grad-inflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="grad-fixed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.6} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border"
                opacity={0.3}
              />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "currentColor" }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{ fontSize: 12, fill: "currentColor" }}
                className="text-muted-foreground"
                tickFormatter={(v) => (v === 0 ? "0" : `${(Math.abs(v) / 1000).toFixed(0)}K`)}
                tickLine={false}
                axisLine={false}
                width={50}
              />

              <Tooltip content={<ChartTooltip />} />

              <Legend
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />

              <ReferenceLine
                y={0}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="2 2"
              />

              <Bar
                dataKey="inflow"
                name="รายรับที่คาด"
                fill="url(#grad-inflow)"
                stroke="#3b82f6"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                barSize={28}
              />

              <Bar
                dataKey="fixedCost"
                name="Fixed Cost"
                fill="url(#grad-fixed)"
                stroke="#f97316"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                barSize={28}
              />

              <Line
                type="monotone"
                dataKey="net"
                name="สุทธิ"
                stroke="#a78bfa"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Footer note */}
        <p className="mt-3 text-xs text-muted-foreground/60">
          รายรับ = installment ที่ยังไม่ได้รับ (Pending) ตามวันครบกำหนด · Fixed Cost = ค่าใช้จ่ายคงที่จาก Google Sheet แท็บ Fixed_Costs
        </p>
      </CardContent>
    </Card>
  );
}
