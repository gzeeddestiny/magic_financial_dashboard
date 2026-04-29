"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendInstallmentReminder } from "@/actions/installments";
import type { ArInstallmentRow } from "@/actions/dashboard";

interface ArTableProps {
  data: ArInstallmentRow[];
}

function StatusBadge({ status, autoMatched }: { status: ArInstallmentRow["status"]; autoMatched: boolean }) {
  if (status === "Paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" />
        รับเงินแล้ว{autoMatched ? " (INV)" : ""}
      </span>
    );
  }
  if (status === "Overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-500/15 text-red-700 border border-red-500/20">
        <AlertTriangle className="h-3 w-3" />
        เกินกำหนด
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/20">
      <Clock className="h-3 w-3" />
      รอรับเงิน
    </span>
  );
}

function formatDate(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatCurrency(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ReminderButton({ row }: { row: ArInstallmentRow }) {
  const [isPending, startTransition] = useTransition();
  const [sendCount, setSendCount] = useState(row.reminderSent ? 1 : 0);

  if (row.status === "Paid") return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await sendInstallmentReminder(row.blNumber, row.installmentNo);
            if (result.success) {
              setSendCount((c) => c + 1);
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-700 border border-purple-500/25 hover:bg-purple-500/20 hover:text-purple-800 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Bell className="h-3 w-3" />
        )}
        {isPending ? "กำลังส่ง..." : "แจ้งทีม"}
      </button>
      {sendCount > 0 && (
        <span className="text-[10px] text-emerald-700/80">
          แจ้งแล้ว {sendCount} ครั้ง
        </span>
      )}
    </div>
  );
}

export function ArInstallmentTable({ data }: ArTableProps) {
  const [showPaid, setShowPaid] = useState(false);

  const unpaid = data.filter((r) => r.status !== "Paid");
  const paid = data.filter((r) => r.status === "Paid");
  const visible = showPaid ? data : unpaid;

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold">รายการหนี้ค้างรับ (AR)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unpaid.length} รายการรอรับ · {paid.length} รายการรับแล้ว (match จาก INV อัตโนมัติ)
          </p>
        </div>
        <button
          onClick={() => setShowPaid((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPaid ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showPaid ? "ซ่อนที่รับแล้ว" : `แสดงที่รับแล้ว (${paid.length})`}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="px-4 py-3 text-left font-medium">โปรเจกต์</th>
              <th className="px-4 py-3 text-left font-medium">BL / งวด</th>
              <th className="px-4 py-3 text-right font-medium">ยอด (฿)</th>
              <th className="px-4 py-3 text-center font-medium">ครบกำหนด</th>
              <th className="px-4 py-3 text-center font-medium">สถานะ</th>
              <th className="px-4 py-3 text-center font-medium">แจ้งเตือน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  ไม่มีรายการค้างรับ
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const key = `${row.blNumber}-${row.installmentNo}`;
                return (
                  <tr
                    key={key}
                    className={`hover:bg-accent/30 transition-colors ${row.status === "Paid" ? "opacity-40" : ""}`}
                  >
                    {/* Project */}
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-[200px]" title={row.projectName}>
                        {row.projectName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {row.clientName}
                      </div>
                    </td>

                    {/* BL / installment */}
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-muted-foreground">{row.blNumber}</div>
                      {row.totalInstallments > 1 && (
                        <div className="text-xs text-purple-700">
                          งวด {row.installmentNo}/{row.totalInstallments}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(row.amountDue)}
                    </td>

                    {/* Due date */}
                    <td className="px-4 py-3 text-center">
                      <div className="text-xs">{formatDate(row.dueDateISO)}</div>
                      {row.status !== "Paid" && row.daysOverdue > 0 && (
                        <div className="text-xs text-red-700">เกิน {row.daysOverdue} วัน</div>
                      )}
                      {row.status !== "Paid" && row.daysOverdue <= 0 && (
                        <div className="text-xs text-emerald-700">อีก {Math.abs(row.daysOverdue)} วัน</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={row.status} autoMatched={row.autoMatchedPaid} />
                    </td>

                    {/* Reminder button */}
                    <td className="px-4 py-3 text-center">
                      <ReminderButton row={row} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
        กดปุ่ม "แจ้งทีม" → สร้าง Google Task + ส่ง Calendar invite (email) ไปยังทีมที่เกี่ยวข้อง
      </div>
    </div>
  );
}
