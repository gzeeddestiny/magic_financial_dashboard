import { google } from "googleapis";
import { Readable } from "stream";
import { getAuthClient } from "./auth";

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuthClient() });
}

async function findOrCreateFolder(
  parentId: string,
  folderName: string
): Promise<string> {
  const drive = getDriveClient();

  const search = await drive.files.list({
    q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
  });

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return created.data.id!;
}

export async function uploadSlipImage(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  date: Date
): Promise<string> {
  const drive = getDriveClient();

  const yyyy = date.getFullYear().toString();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  // Create nested folder: Expenses/YYYY/MM/DD
  const yearFolder = await findOrCreateFolder(ROOT_FOLDER_ID, yyyy);
  const monthFolder = await findOrCreateFolder(yearFolder, mm);
  const dayFolder = await findOrCreateFolder(monthFolder, dd);

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [dayFolder],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink",
  });

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId: uploaded.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return uploaded.data.webViewLink!;
}
