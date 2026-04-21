"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExpenseAnomaly } from "@/types";
import { AlertTriangle } from "lucide-react";

export function AnomalyTable({ data }: { data: ExpenseAnomaly[] }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <CardTitle className="text-lg">Recent Anomalies</CardTitle>
        </div>
        <p className="text-base text-muted-foreground">
          รายจ่ายที่สูงกว่าค่าเฉลี่ยผิดปกติ (&gt;2σ)
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">✅ ไม่พบรายการผิดปกติ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>วันที่</TableHead>
                  <TableHead>โปรเจค</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>จำนวนเงิน</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>% เกินปกติ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, i) => (
                  <TableRow key={i} className="border-border/30 hover:bg-red-500/5">
                    <TableCell className="text-sm whitespace-nowrap">{item.date}</TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate">
                      {item.projectName}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-xs bg-accent text-foreground border-border/30">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-base font-semibold text-red-400 tabular-nums whitespace-nowrap">
                      ฿{item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {item.description}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                        +{item.deviation}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
