import { AI_LIMITS } from "@/lib/ai-config";
import type { SessionUser } from "./auth";
import { db } from "./db";
import { AttachmentError, safeAttachmentName } from "./ai-attachment-parser";
import { readAttachmentBytes, readAttachmentData } from "./ai-attachment-storage";
import { DocumentSchemas, type DocumentToolName } from "./ai-document-tools";
import { convertOfficeToPdf, runDocumentWorker, validateEditableOffice } from "./ai-document-runtime";
export type DocumentResult = { bytes: Buffer; filename: string; note: string; sourceIds: number[] };
export async function executeDocumentTool(session: SessionUser, conversationId: number, name: DocumentToolName, raw: unknown): Promise<DocumentResult> {
  const input = DocumentSchemas[name].parse(raw);
  if(JSON.stringify(input).length>AI_LIMITS.documents.inputChars)throw new AttachmentError("Nội dung tạo tài liệu quá dài; hãy chia nhỏ yêu cầu.");
  const sourceIds = "sources" in input ? input.sources.map(x=>x.fileId) : "fileId" in input ? [input.fileId] : [];
  const sources = [];
  for(const id of sourceIds) {
    const row = await db.tep_dinh_kem_ai.findFirst({where:{id,company_id:session.companyId,account_id:session.userId,hoi_thoai_id:conversationId}});
    if(!row)throw new AttachmentError("Tệp nguồn không thuộc cuộc chat hoặc bạn không có quyền.");
    const expected=name==='fill_word_template'||name==='update_word_text'?'docx':name==='update_excel_cells'?'xlsx':name==='fill_pdf_form'||name==='assemble_pdf'||name==='convert_pdf_to_word'?'pdf':null;
    if(expected&&row.loai_tep!==expected)throw new AttachmentError("Định dạng tệp nguồn không phù hợp với thao tác.");
    const bytes=await readAttachmentBytes(row.khoa_luu_tru);
    if(row.loai_tep==='docx'||row.loai_tep==='xlsx')await validateEditableOffice(bytes,row.loai_tep,name==='update_excel_cells');
    if(name==='fill_word_template'&&'replacements' in input) {
      const data=await readAttachmentData(row.khoa_luu_tru);
      if(data.kind!=='docx'||DocumentSchemas.fill_word_template.parse(input).replacements.some(r=>!data.paragraphs.some(p=>p.includes(`{{${r.placeholder}}}`))))throw new AttachmentError("Mẫu không có đủ placeholder yêu cầu. Hãy đọc đúng mẫu trước khi điền.");
    }
    sources.push({bytes,kind:row.loai_tep});
  }
  let bytes:Buffer, extension:string, note:string;
  if(name==='convert_file_to_pdf') {
    const source=sources[0];if(source.kind!=='docx'&&source.kind!=='xlsx')throw new AttachmentError("Chỉ xuất PDF từ DOCX hoặc XLSX.");
    bytes=await convertOfficeToPdf(source.bytes,source.kind);extension='pdf';note='Đã xuất PDF; giữ bản gốc.';
  } else {
    const result=await runDocumentWorker(name,input,sources);
    if(!result.bytes||!result.extension||!result.note)throw new AttachmentError("Chưa tạo được tệp kết quả.");
    bytes=Buffer.from(result.bytes);extension=result.extension;note=result.note;
  }
  const base=safeAttachmentName(input.filename).replace(/\.(docx|xlsx|pdf|csv)$/i,'').trim();
  if(!base||base==='.'||base==='..')throw new AttachmentError("Tên tệp kết quả không hợp lệ.");
  return {bytes,filename:`${base}.${extension}`,note,sourceIds:[...new Set(sourceIds)]};
}
