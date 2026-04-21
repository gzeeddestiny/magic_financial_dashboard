"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectProfitability } from "@/types";

const statusColors = {
  healthy: "oklch(0.72 0.19 150)",
  warning: "oklch(0.8 0.15 85)",
  danger: "oklch(0.65 0.2 25)",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-lg px-4 py-3 shadow-xl border border-border">
      <p className="text-base font-semibold">{d.name}</p>
      <p className="text-sm text-muted-foreground">{d.clientName}</p>
      <p className="text-base mt-1">Margin: <span className="font-semibold">{d.marginPercent.toFixed(1)}%</span></p>
      <p className="text-sm">Revenue: ฿{d.billedAmount.toLocaleString()}</p>
      <p className="text-sm">Costs: ฿{d.directCosts.toLocaleString()}</p>
    </div>
  );
};

export function ProjectMarginChart({ data }: { data: ProjectProfitability[] }) {
  const chartData = data.map((p) => ({
    name: p.projectName.replace("MAGIC x ", "").slice(0, 25),
    marginPercent: p.marginPercent,
    status: p.status,
    clientName: p.clientName,
    billedAmount: p.billedAmount,
    directCosts: p.directCosts,
  }));

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Project Margin Distribution</CardTitle>
        <p className="text-base text-muted-foreground">กำไร % แต่ละโปรเจกต์</p>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 285)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 14, fill: "oklch(0.65 0.01 285)" }} unit="%" />
              <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 13, fill: "oklch(0.65 0.01 285)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="marginPercent" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={statusColors[entry.status as keyof typeof statusColors]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
