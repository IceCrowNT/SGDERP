import path from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { validateOfficeZip } from "./ai-attachment-parser";
import { TASK_FILE_LIMIT } from "./support-task";
import { TaskError } from "./support-task-access";
export const taskStorage = () =>
  path.resolve(
    process.env.TASK_ATTACHMENT_STORAGE_DIR ||
      path.join(process.cwd(), "var", "task-attachments"),
  );
export async function validateTaskFile(file: File) {
  if (!file.size || file.size > TASK_FILE_LIMIT)
    throw new TaskError("Mỗi tệp phải từ 1 byte đến 10 MiB.");
  const bytes = Buffer.from(await file.arrayBuffer()),
    ext = file.name.split(".").pop()?.toLowerCase();
  let mime: string;
  try {
    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      const image = sharp(bytes, { limitInputPixels: 25_000_000 });
      const meta = await image.metadata();
      if (
        meta.format !== (ext === "png" ? "png" : "jpeg") ||
        (meta.pages ?? 1) > 1
      )
        throw Error();
      await image.stats();
      mime = ext === "png" ? "image/png" : "image/jpeg";
    } else if (ext === "pdf") {
      if (bytes.subarray(0, 5).toString() !== "%PDF-") throw Error();
      await PDFDocument.load(bytes);
      mime = "application/pdf";
    } else if (ext === "docx" || ext === "xlsx") {
      await validateOfficeZip(bytes, ext);
      mime =
        ext === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else throw Error();
  } catch {
    throw new TaskError(
      "Tệp không hợp lệ. Chọn ảnh PNG/JPEG, PDF, DOCX hoặc XLSX không có mật khẩu/macro.",
    );
  }
  return {
    bytes,
    mime,
    name: file.name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(-200),
    sha: createHash("sha256").update(bytes).digest("hex"),
  };
}
export async function storeTaskBytes(bytes: Buffer) {
  const key = randomUUID();
  await mkdir(taskStorage(), { recursive: true, mode: 0o700 });
  await writeFile(path.join(taskStorage(), key), bytes, {
    flag: "wx",
    mode: 0o600,
  });
  return key;
}
export async function readTaskBytes(key: string) {
  return readFile(path.join(taskStorage(), z.string().uuid().parse(key)));
}
