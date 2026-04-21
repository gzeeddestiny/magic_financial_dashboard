"use server";

import { getSheetData, writeSheet } from "@/lib/google/sheets";
import { parseBLRows, deriveProjects } from "@/lib/bl-parser";

/** Read BL_Master → derive projects → write to "Projects" tab in Google Sheet */
export async function syncProjectsToSheet(): Promise<{ count: number }> {
  const blData = await getSheetData("BL_Master", "A2:P");
  const blRows = parseBLRows(blData);
  const projects = deriveProjects(blRows);

  // Build sheet rows: header + data
  const header = [
    "Project_Name",
    "Client_Name",
    "Salesperson",
    "Contract_Value",
    "BL_Count",
    "Type",
  ];

  const rows: (string | number | boolean)[][] = [header];

  for (const p of projects) {
    rows.push([
      p.projectName,
      p.clientName,
      p.salesperson,
      p.totalContractValue,
      p.blCount,
      p.type,
    ]);
  }

  await writeSheet("Projects", rows);

  return { count: projects.length };
}
