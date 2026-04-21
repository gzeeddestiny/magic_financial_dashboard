"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getDataPeriodInfo, type PeriodInfo } from "@/actions/dashboard";

// ─── Thai month labels ───

const THAI_MONTHS_SHORT: Record<string, string> = {
  "01": "ม.ค.", "02": "ก.พ.", "03": "มี.ค.", "04": "เม.ย.",
  "05": "พ.ค.", "06": "มิ.ย.", "07": "ก.ค.", "08": "ส.ค.",
  "09": "ก.ย.", "10": "ต.ค.", "11": "พ.ย.", "12": "ธ.ค.",
};

// ─── Helpers ───

function formatLabel(from: string, to: string): string {
  const [fYear, fMonth] = from.split("-");
  const [tYear, tMonth] = to.split("-");
  if (from === to) return `${THAI_MONTHS_SHORT[fMonth]} ${fYear}`;
  if (fYear === tYear) return `${THAI_MONTHS_SHORT[fMonth]} — ${THAI_MONTHS_SHORT[tMonth]} ${tYear}`;
  return `${THAI_MONTHS_SHORT[fMonth]} ${fYear} — ${THAI_MONTHS_SHORT[tMonth]} ${tYear}`;
}

function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Presets ───

interface Preset {
  key: string;
  label: string;
  getRange: (info: PeriodInfo) => { from: string; to: string };
}

function buildPresets(): Preset[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  return [
    {
      key: "this-month",
      label: "เดือนนี้",
      getRange: () => ({ from: `${y}-${m}`, to: `${y}-${m}` }),
    },
    {
      key: "ytd",
      label: `ปีนี้ (${y})`,
      getRange: (info) => ({
        from: `${y}-01`,
        to: info.max < `${y}-${m}` && info.max >= `${y}-01` ? info.max : `${y}-${m}`,
      }),
    },
    {
      key: "last-year",
      label: `ปีก่อน (${y - 1})`,
      getRange: () => ({ from: `${y - 1}-01`, to: `${y - 1}-12` }),
    },
    {
      key: "all",
      label: "ทั้งหมด",
      getRange: (info) => ({ from: info.min, to: info.max }),
    },
  ];
}

function detectActivePreset(from: string, to: string, info: PeriodInfo | null): string | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${y}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (from === m && to === m) return "this-month";
  if (from === `${y}-01` && to.startsWith(`${y}`)) return "ytd";
  if (from === `${y - 1}-01` && to === `${y - 1}-12`) return "last-year";
  if (info && from === info.min && to === info.max) return "all";
  return null;
}

// ─── Component ───

export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [info, setInfo] = useState<PeriodInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getDataPeriodInfo().then((data) => {
      setInfo(data);
      // Default picker year to latest data year
      setPickerYear(parseInt(data.max.split("-")[0]));
    });
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const from = searchParams.get("from") || info?.ytd.from || "";
  const to = searchParams.get("to") || info?.ytd.to || "";
  const presets = useMemo(() => buildPresets(), []);
  const activePreset = useMemo(() => detectActivePreset(from, to, info), [from, to, info]);
  const label = useMemo(() => (from && to ? formatLabel(from, to) : "กำลังโหลด..."), [from, to]);

  const navigate = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", newFrom);
      params.set("to", newTo);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handlePrev = useCallback(() => {
    if (!from || !to) return;
    navigate(shiftMonth(from, -1), shiftMonth(to, -1));
  }, [from, to, navigate]);

  const handleNext = useCallback(() => {
    if (!from || !to) return;
    navigate(shiftMonth(from, 1), shiftMonth(to, 1));
  }, [from, to, navigate]);

  const yearForPicker = pickerYear ?? new Date().getFullYear();
  const availableYears = useMemo(() => {
    if (!info) return [];
    const s = parseInt(info.min.split("-")[0]);
    const e = parseInt(info.max.split("-")[0]);
    const years: number[] = [];
    for (let y = e; y >= s; y--) years.push(y);
    return years;
  }, [info]);

  return (
    <div className="relative flex items-center gap-1">
      {/* Prev */}
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev} disabled={!from}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
      >
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="min-w-[4rem] text-center">{label}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Next */}
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext} disabled={!from}>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      {/* Panel */}
      {open && info && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-popover p-3 shadow-lg ring-1 ring-foreground/5 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Presets */}
          <div className="mb-3 space-y-0.5">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              ช่วงเวลา
            </p>
            {presets.map((preset) => {
              const isActive = activePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  onClick={() => {
                    const r = preset.getRange(info);
                    navigate(r.from, r.to);
                    setOpen(false);
                  }}
                  className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-border mb-3" />

          {/* Month picker */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              เลือกเดือน
            </p>

            {/* Year nav */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setPickerYear((prev) => (prev ?? yearForPicker) - 1)}
                disabled={yearForPicker <= availableYears[availableYears.length - 1]}
                className="rounded p-0.5 hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold">{yearForPicker}</span>
              <button
                onClick={() => setPickerYear((prev) => (prev ?? yearForPicker) + 1)}
                disabled={yearForPicker >= availableYears[0]}
                className="rounded p-0.5 hover:bg-accent disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* 4×3 month grid */}
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const mm = String(i + 1).padStart(2, "0");
                const key = `${yearForPicker}-${mm}`;
                const hasData = key >= info.min && key <= info.max;
                const isStart = key === from;
                const isEnd = key === to;
                const isEdge = isStart || isEnd;
                const isInRange = from && to && key >= from && key <= to;

                return (
                  <button
                    key={mm}
                    disabled={!hasData}
                    onClick={() => {
                      navigate(key, key);
                      setOpen(false);
                    }}
                    className={[
                      "rounded-md py-1.5 text-xs font-medium transition-all",
                      !hasData && "opacity-25 cursor-not-allowed",
                      hasData && !isInRange && "text-foreground hover:bg-accent",
                      isInRange && !isEdge && "bg-primary/15 text-primary",
                      isEdge && "bg-primary text-primary-foreground shadow-sm",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {THAI_MONTHS_SHORT[mm]}
                  </button>
                );
              })}
            </div>

            {/* Select full year */}
            <button
              onClick={() => {
                const yFrom = `${yearForPicker}-01`;
                const yTo = `${yearForPicker}-12`;
                navigate(
                  yFrom < info.min ? info.min : yFrom,
                  yTo > info.max ? info.max : yTo,
                );
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md border border-dashed border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              ทั้งปี {yearForPicker}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
