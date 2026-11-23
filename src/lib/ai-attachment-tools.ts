import type { SessionUser } from "./auth";
import { db } from "./db";
import { analyzeSheet, AttachmentError, readFileData } from "./ai-attachment-parser";
import { readAttachmentBytes, readAttachmentData } from "./ai-attachment-storage";
import { FileReadSchema, FileAnalyzeSchema, PdfPageReadSchema } from "./ai-attachments";
import { runDocumentWorker } from "./ai-document-runtime";
export async function executeAttachmentTool(session: SessionUser, conversationId: number, name: string, input: unknown) {
  const v = (name === "read_pdf_page" ? PdfPageReadSchema : name === "read_ai_attachment" ? FileReadSchema : FileAnalyzeSchema).parse(input);
  const row = await db.tep_dinh_kem_ai.findFirst({ where: { id: v.fileId, company_id: session.companyId, account_id: session.userId, hoi_thoai_id: conversationId } });
  if (!row) throw new AttachmentError("Tệp không thuộc cuộc chat này hoặc bạn không có quyền đọc.");
  if (name === "read_pdf_page") {
    if (row.loai_tep !== "pdf") throw new AttachmentError("Chọn tệp PDF để đọc trang.");
    const result = await runDocumentWorker(name, PdfPageReadSchema.parse(input), [{ bytes: await readAttachmentBytes(row.khoa_luu_tru) }]);
    if (!result.pdfPage) throw new AttachmentError("Chưa đọc được trang PDF.");
    const { image, ...page } = result.pdfPage;
    return { table: undefined, fileId: row.id, output: { file: row.ten_tep, ...page, note: "Đối chiếu ảnh trang; lớp chữ có thể thiếu hình/bảng. Bản scan cần model vision; chữ mờ phải xác minh." }, image: `data:image/png;base64,${Buffer.from(image).toString("base64")}` };
  }
  const data = await readAttachmentData(row.khoa_luu_tru);
  const result = name === "read_ai_attachment" ? readFileData(data, row.ten_tep, input) : analyzeSheet(data, row.ten_tep, input);
  return { ...result, fileId: row.id, ...(data.kind === "image" ? { image: `data:image/jpeg;base64,${(await readAttachmentBytes(row.khoa_luu_tru, true)).toString("base64")}` } : {}) };
}
