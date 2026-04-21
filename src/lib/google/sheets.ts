import { google } from "googleapis";
import { getAuthClient } from "./auth";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuthClient() });
}

export async function getSheetData(
  tabName: string,
  range?: string
): Promise<string[][]> {
  const sheets = getSheetsClient();
  const fullRange = range ? `${tabName}!${range}` : tabName;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: fullRange,
  });

  return (response.data.values as string[][]) || [];
}

export async function batchGet(
  ranges: string[]
): Promise<Record<string, string[][]>> {
  const sheets = getSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges,
    });

    const result: Record<string, string[][]> = {};
    response.data.valueRanges?.forEach((vr, i) => {
      result[ranges[i]] = (vr.values as string[][]) || [];
    });

    return result;
  } catch {
    // If batchGet fails (e.g. missing tab), fall back to fetching each range individually
    const result: Record<string, string[][]> = {};
    for (const range of ranges) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range,
        });
        result[range] = (response.data.values as string[][]) || [];
      } catch {
        // Tab doesn't exist or range is invalid — return empty array
        result[range] = [];
      }
    }
    return result;
  }
}

export async function appendRow(
  tabName: string,
  values: (string | number | boolean)[]
): Promise<void> {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: tabName,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values],
    },
  });
}

export async function updateCell(
  tabName: string,
  range: string,
  value: string | number | boolean
): Promise<void> {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!${range}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });
}

export async function updateRow(
  tabName: string,
  range: string,
  values: (string | number | boolean)[]
): Promise<void> {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!${range}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values],
    },
  });
}

/** Clear a tab and write all rows (header + data) */
export async function writeSheet(
  tabName: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const sheets = getSheetsClient();

  // Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: tabName,
  });

  // Write all rows
  if (values.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });
  }
}
