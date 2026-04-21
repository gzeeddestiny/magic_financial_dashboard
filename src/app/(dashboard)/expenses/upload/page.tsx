import { UploadForm } from "@/components/expenses/upload-form";
import { getSheetData } from "@/lib/google/sheets";

export default async function ExpenseUploadPage() {
  let projects: string[] = [];

  try {
    const data = await getSheetData("BL_Master", "F2:F");
    projects = [...new Set(data.map((row) => row[0]).filter(Boolean))].sort();
  } catch {
    projects = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">อัปโหลดรายจ่าย</h2>
        <p className="text-muted-foreground">
          อัปโหลดสลิปเพื่อให้ AI อ่านข้อมูลอัตโนมัติ หรือกรอกข้อมูลด้วยตนเอง
        </p>
      </div>
      <UploadForm projects={projects} />
    </div>
  );
}
