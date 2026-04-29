"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectProfitability } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectRankingProps {
  data: ProjectProfitability[];
  variant: "top" | "bottom";
}

export function ProjectRanking({ data, variant }: ProjectRankingProps) {
  const items = variant === "top" ? data.slice(0, 5) : data.slice(-5).reverse();
  const title = variant === "top" ? "🏆 Top 5 Projects" : "⚠️ Bottom 5 Projects";

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((p, i) => (
            <div
              key={p.projectName}
              className="flex items-center gap-3 rounded-lg bg-accent/30 p-3 transition-colors hover:bg-accent/50"
            >
              <span className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                variant === "top" ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"
              )}>
                {variant === "top" ? i + 1 : items.length - i}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate">{p.projectName.replace("MAGIC x ", "")}</p>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{p.clientName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-semibold">฿{p.margin.toLocaleString()}</p>
                <Badge
                  variant={p.status === "healthy" ? "default" : p.status === "warning" ? "secondary" : "destructive"}
                  className={cn(
                    "text-xs px-1.5 mt-0.5",
                    p.status === "healthy" && "bg-green-500/20 text-green-700 border-green-500/30",
                    p.status === "warning" && "bg-amber-500/20 text-amber-700 border-amber-500/30",
                    p.status === "danger" && "bg-red-500/20 text-red-700 border-red-500/30"
                  )}
                >
                  {p.marginPercent.toFixed(0)}%
                </Badge>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">ไม่มีข้อมูล</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
