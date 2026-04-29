"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectProfitability } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

type SortKey = "projectName" | "contractValue" | "billedAmount" | "directCosts" | "marginPercent";

export function ProjectTable({ data }: { data: ProjectProfitability[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("marginPercent");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead
      className="cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === k ? "text-primary" : "text-muted-foreground/40")} />
      </span>
    </TableHead>
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Master Project Table</CardTitle>
        <p className="text-base text-muted-foreground">คลิก header เพื่อเรียงลำดับ</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>โปรเจกต์</TableHead>
                <TableHead>ลูกค้า</TableHead>
                <SortHeader label="สัญญา" k="contractValue" />
                <SortHeader label="วางบิล" k="billedAmount" />
                <SortHeader label="ต้นทุน" k="directCosts" />
                <SortHeader label="Margin" k="marginPercent" />
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.projectName} className="border-border/30 hover:bg-accent/30">
                  <TableCell className="font-medium text-base max-w-[200px] truncate">
                    {p.projectName.replace("MAGIC x ", "")}
                  </TableCell>
                  <TableCell className="text-base text-muted-foreground max-w-[150px] truncate">
                    {p.clientName}
                  </TableCell>
                  <TableCell className="text-base tabular-nums">฿{p.contractValue.toLocaleString()}</TableCell>
                  <TableCell className="text-base tabular-nums">฿{p.billedAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-base tabular-nums">฿{p.directCosts.toLocaleString()}</TableCell>
                  <TableCell className="text-base font-semibold tabular-nums">{p.marginPercent.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-xs",
                      p.status === "healthy" && "bg-green-500/20 text-green-700 border-green-500/30",
                      p.status === "warning" && "bg-amber-500/20 text-amber-700 border-amber-500/30",
                      p.status === "danger" && "bg-red-500/20 text-red-700 border-red-500/30"
                    )}>
                      {p.status === "healthy" ? "🟢 ปกติ" : p.status === "warning" ? "🟡 เฝ้าระวัง" : "🔴 ขาดทุน"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
