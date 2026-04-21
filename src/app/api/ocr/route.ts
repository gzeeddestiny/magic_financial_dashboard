import { NextRequest, NextResponse } from "next/server";
import { extractSlipData } from "@/lib/ai/ocr";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์รูปภาพ" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const result = await extractSlipData(base64, file.type);

    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอ่านข้อมูลจากสลิปได้" },
      { status: 500 }
    );
  }
}
