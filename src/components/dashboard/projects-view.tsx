"use client";

import { useState, useMemo } from "react";
import { ProjectMarginChart } from "@/components/charts/project-margin";
import { ProjectTable } from "@/components/charts/project-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectProfitability } from "@/types";

interface ProjectsViewProps {
  data: ProjectProfitability[];
  types: string[];
  pms: string[];
}

export function ProjectsView({ data, types, pms }: ProjectsViewProps) {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedPm, setSelectedPm] = useState("all");

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (selectedType !== "all" && p.projectType !== selectedType) return false;
      if (selectedPm !== "all" && p.projectManager !== selectedPm) return false;
      return true;
    });
  }, [data, selectedType, selectedPm]);

  const running = filtered.filter((p) => p.projectStatus === "running");
  const closed = filtered.filter((p) => p.projectStatus === "closed");

  const healthyCount = running.filter((p) => p.status === "healthy").length;
  const warningCount = running.filter((p) => p.status === "warning").length;
  const dangerCount = running.filter((p) => p.status === "danger").length;

  return (
    <div className="space-y-10">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <Select
            value={selectedType}
            onValueChange={(v: string | null) => setSelectedType(v ?? "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="ประเภทโปรเจกต์" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select
            value={selectedPm}
            onValueChange={(v: string | null) => setSelectedPm(v ?? "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Project Manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกคน</SelectItem>
              {pms.map((pm) => (
                <SelectItem key={pm} value={pm}>
                  {pm}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== Running Projects ===== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-blue-400 shrink-0" />
          <h2 className="text-xl font-semibold">กำลังดำเนินงาน</h2>
          <span className="text-sm text-muted-foreground">({running.length} โปรเจกต์)</span>
          <div className="flex gap-2 ml-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />{healthyCount} ปกติ
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{warningCount} เฝ้าระวัง
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />{dangerCount} ขาดทุน
            </span>
          </div>
        </div>
        <ProjectMarginChart data={running} />
        <ProjectTable data={running} />
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* ===== Closed Projects ===== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-slate-400 shrink-0" />
          <h2 className="text-xl font-semibold text-muted-foreground">ปิดแล้ว</h2>
          <span className="text-sm text-muted-foreground">({closed.length} โปรเจกต์ · ชำระครบแล้ว)</span>
        </div>
        {closed.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">ยังไม่มีโปรเจกต์ที่ปิดแล้ว</p>
        ) : (
          <ProjectTable data={closed} />
        )}
      </div>
    </div>
  );
}
