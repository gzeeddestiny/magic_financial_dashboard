"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="glass-card rounded-2xl p-10 max-w-md text-center space-y-5">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-base text-muted-foreground">
            ไม่สามารถโหลดข้อมูลได้ อาจเกิดจาก Google Sheets API ขัดข้อง
          </p>
          {error.message && (
            <p className="text-sm text-muted-foreground/60 font-mono bg-accent/50 rounded-lg px-3 py-2 mt-3">
              {error.message}
            </p>
          )}
        </div>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          ลองใหม่อีกครั้ง
        </Button>
      </div>
    </div>
  );
}
