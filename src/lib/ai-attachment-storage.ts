import path from "node:path";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { z } from "zod";
import type { tep_dinh_kem_ai } from "@prisma/client";
import { AttachmentSchema, type AiAttachment } from "./ai-attachments";
import type { ParsedFile } from "./ai-attachment-parser";
export const attachmentDirectory = () => path.resolve(process.env.AI_ATTACHMENT_STORAGE_DIR || path.join(process.cwd(), "var", "ai-attachments"));
function directory(key: string) { return path.join(attachmentDirectory(), z.string().uuid().parse(key)); }
export async function writeAttachment(key: string, original: Buffer, data: ParsedFile, preview?: Buffer) {
  const dir = directory(key); await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(dir, "original"), original, { mode: 0o600, flag: "wx" });
  await writeFile(path.join(dir, "parsed.json"), JSON.stringify(data), { mode: 0o600, flag: "wx" });
  if (preview) await writeFile(path.join(dir, "preview.jpg"), preview, { mode: 0o600, flag: "wx" });
}
export async function removeAttachmentBytes(key: string) { await rm(directory(key), { recursive: true, force: true }); }
export async function readAttachmentBytes(key: string, preview = false) { return readFile(path.join(directory(key), preview ? "preview.jpg" : "original")); }
export async function readAttachmentData(key: string): Promise<ParsedFile> { return JSON.parse(await readFile(path.join(directory(key), "parsed.json"), "utf8")); }
export function attachmentView(row: tep_dinh_kem_ai): AiAttachment {
  const summary = z.object({ note: z.string(), generated: z.boolean().optional() }).safeParse(row.tom_tat);
  return AttachmentSchema.parse({ id: row.id, name: row.ten_tep, kind: row.loai_tep, size: row.dung_luong, messageId: row.tin_nhan_id, note: summary.success ? summary.data.note : "", generated: summary.success && summary.data.generated === true });
}
