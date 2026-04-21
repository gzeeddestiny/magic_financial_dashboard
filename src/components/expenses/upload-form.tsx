"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Check } from "lucide-react";
import { submitExpense } from "@/actions/expenses";
import { toast } from "sonner";

const CATEGORIES = [
  "Media",
  "Payroll",
  "Office",
  "Travel",
  "Software",
  "Food",
  "Freelance",
  "Other",
];

interface UploadFormProps {
  projects: string[];
}

export function UploadForm({ projects }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    projectName: "",
    category: "",
    amount: 0,
    description: "",
  });

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));

      // Auto-scan with OCR
      setIsScanning(true);
      try {
        const fd = new FormData();
        fd.append("file", selectedFile);

        const res = await fetch("/api/ocr", { method: "POST", body: fd });
        if (res.ok) {
          const ocrData = await res.json();
          setFormData((prev) => ({
            ...prev,
            date: ocrData.date || prev.date,
            amount: ocrData.amount || prev.amount,
            category: ocrData.category || prev.category,
            description: ocrData.description || prev.description,
          }));
          toast.success("AI อ่านสลิปสำเร็จ กรุณาตรวจสอบข้อมูล");
        } else {
          toast.error("ไม่สามารถอ่านสลิปได้ กรุณากรอกข้อมูลด้วยตนเอง");
        }
      } catch {
        toast.error("เกิดข้อผิดพลาดในการอ่านสลิป");
      } finally {
        setIsScanning(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.type.startsWith("image/")) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectName || !formData.category || !formData.amount) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let imageFileName: string | undefined;

      if (file) {
        const bytes = await file.arrayBuffer();
        imageBase64 = Buffer.from(bytes).toString("base64");
        imageMimeType = file.type;
        imageFileName = file.name;
      }

      await submitExpense({
        ...formData,
        imageBase64,
        imageMimeType,
        imageFileName,
      });

      toast.success("บันทึกรายจ่ายสำเร็จ");
      setFile(null);
      setPreview(null);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        projectName: "",
        category: "",
        amount: 0,
        description: "",
      });
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      {/* Image Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">อัปโหลดสลิป</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() =>
              document.getElementById("file-input")?.click()
            }
          >
            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
                {isScanning && (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI กำลังอ่านสลิป...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-xs text-muted-foreground/60">
                  รองรับ PNG, JPG, WEBP
                </p>
              </div>
            )}
          </div>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">รายละเอียดรายจ่าย</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">วันที่</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">โปรเจกต์</Label>
            <Select
              value={formData.projectName}
              onValueChange={(v: string | null) =>
                setFormData({ ...formData, projectName: v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกโปรเจกต์" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">หมวดหมู่</Label>
            <Select
              value={formData.category}
              onValueChange={(v: string | null) =>
                setFormData({ ...formData, category: v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="รายละเอียดรายจ่าย"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isScanning}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                บันทึกรายจ่าย
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
