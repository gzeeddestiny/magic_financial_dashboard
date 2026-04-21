"use server";

import { appendRow } from "@/lib/google/sheets";
import { uploadSlipImage } from "@/lib/google/drive";

interface SubmitExpenseInput {
  date: string;
  projectName: string;
  category: string;
  amount: number;
  description: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageFileName?: string;
}

export async function submitExpense(input: SubmitExpenseInput) {
  let imageUrl = "";

  if (input.imageBase64 && input.imageMimeType && input.imageFileName) {
    const buffer = Buffer.from(input.imageBase64, "base64");
    imageUrl = await uploadSlipImage(
      buffer,
      input.imageMimeType,
      input.imageFileName,
      new Date(input.date)
    );
  }

  await appendRow("Expenses", [
    input.date,
    input.projectName,
    input.category,
    input.amount,
    input.description,
    imageUrl,
  ]);

  return { success: true, imageUrl };
}
