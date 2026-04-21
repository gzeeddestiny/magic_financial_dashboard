"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArAgingBucket } from "@/types";

const bucketColors: Record<string, string> = {
  "0-30 วัน": "oklch(0.7 0.2 290)",
  "31-60 วัน": "oklch(0.8 0.15 85)",
  "61-90 วัน": "oklch(0.75 0.15 55)",
  ">90 วัน": "oklch(0.65 0.2 25)",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-lg px-4 py-3 shadow-xl border border-border">
      <p className="text-base font-semibold">{d.bucket}</p>
      <p className="text-base">ยอดค้าง: ฿{d.amount.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{d.count} รายการ</p>
    </div>
  );
};

export function ArAgingChart({ data }: { data: ArAgingBucket[] }) {
  const totalOutstanding = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">A/R Aging</CardTitle>
        <p className="text-base text-muted-foreground">
          หนี้ค้างรับทั้งหมด ฿{totalOutstanding.toLocaleString()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 285)" />
              <XAxis dataKey="bucket" tick={{ fontSize: 14, fill: "oklch(0.65 0.01 285)" }} />
              <YAxis tick={{ fontSize: 14, fill: "oklch(0.65 0.01 285)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={bucketColors[entry.bucket] || "oklch(0.5 0 0)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
