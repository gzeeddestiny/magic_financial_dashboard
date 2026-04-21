"use client";

import {
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyTrend } from "@/types";
import { useState } from "react";

// ─── Colors ───

const COLORS = {
  revenue: { stroke: "#22c55e", fill: "#22c55e" },
  expenses: { stroke: "#ef4444", fill: "#ef4444" },
  net: { stroke: "#a78bfa", fill: "#a78bfa" },
};

type SeriesKey = "revenue" | "expenses" | "net";

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "revenue", label: "รายรับ", color: COLORS.revenue.stroke },
  { key: "expenses", label: "รายจ่าย", color: COLORS.expenses.stroke },
  { key: "net", label: "สุทธิ", color: COLORS.net.stroke },
];

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
              ฿{Math.abs(p.value)?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───

export function RevenueExpenseTrend({ data }: { data: MonthlyTrend[] }) {
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());

  const toggle = (key: SeriesKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
  const totalNet = totalRevenue - totalExpenses;

  // Negate expenses for display (show below zero axis)
  const chartData = data.map((d) => ({ ...d, expenses: -d.expenses }));

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">รายรับ · รายจ่าย · สุทธิ</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              แนวโน้มรายเดือน — กดชื่อเพื่อซ่อน/แสดง
            </p>
          </div>

          {/* Summary pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-500">
              รับ ฿{(totalRevenue / 1000).toFixed(0)}K
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">
              จ่าย ฿{(totalExpenses / 1000).toFixed(0)}K
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                totalNet >= 0
                  ? "bg-purple-500/10 text-purple-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              สุทธิ {totalNet < 0 ? "-" : ""}฿{(Math.abs(totalNet) / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Interactive legend */}
        <div className="flex items-center gap-4 mb-4">
          {SERIES.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-opacity ${
                hidden.has(key) ? "opacity-30 line-through" : "opacity-100"
              }`}
            >
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.revenue.fill} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.revenue.fill} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.expenses.fill} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.expenses.fill} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.3} />

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

              <ReferenceLine y={0} stroke="currentColor" className="text-border" strokeDasharray="2 2" />

              {/* Net as bar (behind the area lines) */}
              {!hidden.has("net") && (
                <Bar
                  dataKey="net"
                  name="สุทธิ"
                  fill={COLORS.net.fill}
                  fillOpacity={0.25}
                  stroke={COLORS.net.stroke}
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              )}

              {!hidden.has("revenue") && (
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="รายรับ"
                  stroke={COLORS.revenue.stroke}
                  strokeWidth={2}
                  fill="url(#grad-revenue)"
                  dot={{ r: 3, fill: COLORS.revenue.stroke, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                />
              )}

              {!hidden.has("expenses") && (
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="รายจ่าย"
                  stroke={COLORS.expenses.stroke}
                  strokeWidth={2}
                  fill="url(#grad-expenses)"
                  dot={{ r: 3, fill: COLORS.expenses.stroke, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
