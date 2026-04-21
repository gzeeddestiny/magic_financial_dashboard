import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const ocrSchema = z.object({
  date: z
    .string()
    .describe("Transaction date in YYYY-MM-DD format"),
  amount: z
    .number()
    .describe("Transaction amount in Thai Baht"),
  category: z
    .string()
    .describe(
      "Expense category: Media, Payroll, Office, Travel, Software, Food, Freelance, Other"
    ),
  description: z
    .string()
    .describe("Brief description of the expense in Thai"),
});

export type OcrOutput = z.infer<typeof ocrSchema>;

export async function extractSlipData(
  imageBase64: string,
  mimeType: string
): Promise<OcrOutput> {
  const { object } = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: ocrSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageBase64,
            mediaType: mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
          },
          {
            type: "text",
            text: `วิเคราะห์สลิปการเงินนี้และสกัดข้อมูลออกมา:
- วันที่ทำรายการ (format: YYYY-MM-DD)
- จำนวนเงิน (ตัวเลข ไม่ต้องมีสกุลเงิน)
- หมวดหมู่ (เลือกจาก: Media, Payroll, Office, Travel, Software, Food, Freelance, Other)
- รายละเอียดสั้นๆ เป็นภาษาไทย

ถ้าอ่านไม่ได้ให้ใช้ค่าเริ่มต้นที่เหมาะสม`,
          },
        ],
      },
    ],
  });

  return object;
}
