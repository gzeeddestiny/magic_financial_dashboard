"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CashForecast } from "@/types";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card rounded-lg px-4 py-3 shadow-xl border border-border">
      <p className="text-base font-semibold">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: p.color }}>
          {p.name}: ฿{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export function CashForecastChart({ data }: { data: CashForecast[] }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Cash Forecast</CardTitle>
        <p className="text-base text-muted-foreground">คาดการณ์เงินสด 3 เดือนข้างหน้า</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 285)" />
              <XAxis dataKey="month" tick={{ fontSize: 14, fill: "oklch(0.65 0.01 285)" }} />
              <YAxis tick={{ fontSize: 14, fill: "oklch(0.65 0.01 285)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="projected"
                name="คาดการณ์"
                stroke="oklch(0.7 0.2 290)"
                fill="url(#cashGradient)"
                strokeWidth={2.5}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="จริง"
                stroke="oklch(0.65 0.18 320)"
                fill="oklch(0.65 0.18 320 / 10%)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
