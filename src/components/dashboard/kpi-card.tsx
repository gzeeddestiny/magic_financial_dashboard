import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  description?: string;
  info?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  variant?: "default" | "profit" | "loss" | "warning";
}

export function KpiCard({
  title,
  value,
  description,
  info,
  trend,
  icon,
  variant = "default",
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "glass-card transition-all duration-300 hover:scale-[1.02] overflow-visible!",
        variant === "profit" && "glow-profit",
        variant === "loss" && "glow-loss",
        variant === "warning" && "glow-warning",
        variant === "default" && "glow-brand"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="relative group/icon">
            <div
              className={cn(
                "rounded-lg p-2 cursor-default",
                variant === "profit" && "bg-green-500/10 text-green-400",
                variant === "loss" && "bg-red-500/10 text-red-400",
                variant === "warning" && "bg-amber-500/10 text-amber-400",
                variant === "default" && "bg-purple-500/10 text-purple-400"
              )}
            >
              {icon}
            </div>
            {info && (
              <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-50 w-56 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg opacity-0 group-hover/icon:opacity-100 transition-opacity duration-150">
                {info}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <p className="text-base text-muted-foreground mt-1.5 flex items-center gap-1.5">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold text-base",
                  trend.isPositive ? "text-green-400" : "text-red-400"
                )}
              >
                <span className="text-base leading-none">
                  {trend.isPositive ? "↑" : "↓"}
                </span>
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
            {description && (
              <span className="text-muted-foreground/80">{description}</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
