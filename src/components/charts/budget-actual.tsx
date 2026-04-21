"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetVsActual } from "@/actions/dashboard";

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

export function BudgetActualChart({ data }: { data: BudgetVsActual[] }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Budget vs Actual</CardTitle>
        <p className="text-base text-muted-foreground">งบประมาณ vs ใช้จริง (เดือนนี้)</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 285)" />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: "oklch(0.65 0.01 285)" }} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 14, fill: "oklch(0.65 0.01 285)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Bar dataKey="budget" name="งบประมาณ" fill="oklch(0.5 0.12 290)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="ใช้จริง" fill="oklch(0.7 0.2 290)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
