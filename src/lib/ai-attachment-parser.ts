import { runDocumentWorker, type PdfInfo } from "./ai-document-runtime";
import sharp from "sharp";
import path from "node:path";
import { Worker } from "node:worker_threads";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import yauzl from "yauzl";
import { AI_FILE_MAX_BYTES, FileAnalyzeSchema, FileReadSchema, type AttachmentTable } from "./ai-attachments";

export class AttachmentError extends Error {}
type Cell = string | number | null;
export type SheetData = { name: string; rows: Cell[][]; formulas: number; missingFormulaValues: number };
export type ParsedFile = { kind: "pdf"; note: string; pdf: PdfInfo } | { kind: "image"; note: string } | { kind: "docx"; note: string; paragraphs: string[] } | { kind: "xlsx" | "csv"; note: string; sheets: SheetData[] };
export function safeAttachmentName(name: string) { return name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(-200); }

// Office ZIPs are fully streamed before a parser sees them; count actual inflated bytes, not only headers.
export async function validateOfficeZip(buffer: Buffer, kind: "docx" | "xlsx") {
  const names = new Set<string>();
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new AttachmentError("Tệp Office không hợp lệ hoặc đã mã hóa."));
      let total = 0, entries = 0, ended = false;
      const fail = () => { if (!ended) { ended = true; zip.close(); reject(new AttachmentError("Tệp Office bị lỗi, có macro hoặc vượt giới hạn giải nén 30 MiB/2.000 mục.")); } };
      zip.on("error", fail); zip.on("end", () => { if (!ended) { ended = true; resolve(); } });
      zip.on("entry", entry => {
        if (++entries > 2000 || entry.uncompressedSize > 30 * 1024 * 1024 || /vbaProject|\.bin$|(^|\/)\.\./i.test(entry.fileName) || names.has(entry.fileName)) return fail();
        names.add(entry.fileName);
        zip.openReadStream(entry, (err, stream) => {
          if (err || !stream) return fail();
          stream.on("error", fail); stream.on("data", chunk => { total += chunk.length; if (total > 30 * 1024 * 1024) { stream.destroy(); fail(); } });
          stream.on("end", () => { if (!ended) zip.readEntry(); });
        });
      }); zip.readEntry();
    });
  });
  if (!names.has(kind === "docx" ? "word/document.xml" : "xl/workbook.xml")) throw new AttachmentError("Nội dung tệp không đúng định dạng đã chọn.");
}
export async function parseAttachment(buffer: Buffer, filename: string): Promise<{ data: ParsedFile; preview?: Buffer }> {
  if (!buffer.length || buffer.length > AI_FILE_MAX_BYTES) throw new AttachmentError("Mỗi tệp phải từ 1 byte đến 10 MiB.");
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "webp"].includes(ext ?? "")) {
    try {
      const image = sharp(buffer, { limitInputPixels: 25_000_000 }); const meta = await image.metadata();
      if (!["png", "jpeg", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) > 1) throw Error();
      const preview = await image.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      return { data: { kind: "image", note: "Ảnh được tối ưu tối đa 2.048px để phân tích; chữ quá nhỏ có thể cần ảnh cận cảnh." }, preview };
    } catch { throw new AttachmentError("Ảnh không hợp lệ, ảnh động hoặc vượt 25 triệu pixel. Dùng PNG, JPEG, WebP tĩnh."); }
  }
  if (ext === "pdf") {
    if (buffer.subarray(0,5).toString() !== "%PDF-") throw new AttachmentError("Tệp PDF không hợp lệ.");
    const result = await runDocumentWorker("inspect_pdf", {}, [{ bytes: buffer }]);
    if (!result.pdf) throw new AttachmentError("Không đọc được cấu trúc PDF.");
    return { data: { kind: "pdf", pdf: result.pdf, note: "Đọc số trang và trường biểu mẫu; dùng read_pdf_page để đọc lớp chữ và ảnh từng trang PDF." } };
  }
  if (ext !== "docx" && ext !== "xlsx" && ext !== "csv") throw new AttachmentError("Hỗ trợ PNG, JPEG, WebP, DOCX, XLSX, CSV và PDF.");
  if (ext !== "csv") await validateOfficeZip(buffer, ext);
  if (ext === "docx") {
    let text: string;
    try { text = (await mammoth.extractRawText({ buffer })).value; } catch { throw new AttachmentError("Không đọc được nội dung Word. Hãy lưu lại dưới dạng DOCX không có mật khẩu."); }
    if (text.length > 300_000) throw new AttachmentError("Word vượt 300.000 ký tự. Hãy chia tài liệu.");
    const paragraphs = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (paragraphs.some(p => p.length > 15000)) throw new AttachmentError("Một đoạn Word vượt 15.000 ký tự. Hãy tách đoạn trước khi tải.");
    if (!paragraphs.length) throw new AttachmentError("Word không có văn bản đọc được; tài liệu chỉ chứa ảnh cần gửi ảnh riêng.");
    return { data: { kind: "docx", paragraphs, note: "Đọc văn bản theo đoạn; chưa đọc ảnh/biểu đồ nhúng, không giữ bố cục trang Word." } };
  }
  const sheets = await new Promise<SheetData[]>((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), "src/lib/ai-sheet-worker.cjs"), { workerData: { buffer, kind: ext }, resourceLimits: { maxOldGenerationSizeMb: 128 } });
    const timer = setTimeout(() => { void worker.terminate(); reject(new AttachmentError("Đọc bảng tính quá 15 giây. Hãy chia tệp.")); }, 15000);
    worker.once("message", (result: { sheets?: SheetData[]; error?: string }) => { clearTimeout(timer); void worker.terminate(); if (result.sheets) resolve(result.sheets); else reject(new AttachmentError(result.error ?? "Không đọc được bảng tính.")); });
    worker.once("error", () => { clearTimeout(timer); reject(new AttachmentError("Không đọc được bảng tính trong giới hạn bộ nhớ. Hãy chia tệp.")); });
    worker.once("exit", code => { clearTimeout(timer); if (code !== 0) reject(new AttachmentError("Tiến trình đọc bảng tính đã dừng. Hãy chia tệp hoặc thử lại.")); });
  });
  return { data: { kind: ext, sheets, note: "Đọc toàn bộ sheet trong giới hạn; không chạy macro/tính lại công thức. Số trong CSV giữ dạng chữ; tính toán chỉ nhận dạng số thập phân rõ ràng, không đoán dấu phân cách hàng nghìn." } };
}
export function fileSummary(data: ParsedFile) {
  return { note: data.note, ...(data.kind === "pdf" ? { pages: data.pdf.pages, fields: data.pdf.fields.length } : {}), ...(data.kind === "docx" ? { paragraphs: data.paragraphs.length } : "sheets" in data ? { sheets: data.sheets.map(s => ({ name: s.name, rows: s.rows.length, columns: s.rows[0]?.length ?? 0, formulas: s.formulas, missingFormulaValues: s.missingFormulaValues })) } : {}) };
}
export function readFileData(data: ParsedFile, name: string, raw: unknown): { table?: AttachmentTable; output: unknown } {
  const v = FileReadSchema.parse(raw);
  if (data.kind === "image") return { output: { file: name, note: data.note, image: true } };
  if (data.kind === "pdf") return { output: { file: name, pages: data.pdf.pages, fields: data.pdf.fields.slice(v.start - 1, v.start - 1 + v.limit), totalFields: data.pdf.fields.length, next: v.start + v.limit <= data.pdf.fields.length ? v.start + v.limit : null, note: data.note } };
  if (data.kind === "docx") {
    const paragraphs = data.paragraphs.slice(v.start - 1, v.start - 1 + v.limit).map((text, i) => ({ paragraph: v.start + i, text }));
    if (JSON.stringify(paragraphs).length > 16000) throw new AttachmentError("Phần văn bản quá dài; giảm số đoạn mỗi lần đọc.");
    return { output: { file: name, paragraphs, totalParagraphs: data.paragraphs.length, next: v.start + v.limit <= data.paragraphs.length ? v.start + v.limit : null, note: data.note } };
  }
  const sheet = data.sheets.find(s => s.name === v.sheet) ?? (v.sheet === null && data.sheets.length === 1 ? data.sheets[0] : undefined);
  if (!sheet) throw new AttachmentError("Chọn đúng tên sheet từ danh sách tệp.");
  const rows = sheet.rows.slice(v.start - 1, v.start - 1 + v.limit).map((r, i) => [v.start + i, ...r]);
  if (JSON.stringify(rows).length > 16000) throw new AttachmentError("Vùng dữ liệu quá dài; giảm số dòng mỗi lần đọc.");
  const table = { source: `${name} · ${sheet.name} · dòng ${v.start}–${v.start + rows.length - 1}`, columns: ["Dòng", ...Array.from({ length: sheet.rows[0]?.length ?? 0 }, (_, c) => XLSX.utils.encode_col(c))], rows, note: `${data.note} Ô công thức thiếu kết quả: ${sheet.missingFormulaValues}.` };
  return { table, output: { ...table, totalRows: sheet.rows.length, next: v.start + v.limit <= sheet.rows.length ? v.start + v.limit : null } };
}
function numberValue(value: Cell) { return typeof value === "number" ? value : typeof value === "string" && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim()) ? Number(value.trim()) : null; }
export function analyzeSheet(data: ParsedFile, name: string, raw: unknown): { table: AttachmentTable; output: unknown } {
  const v = FileAnalyzeSchema.parse(raw);
  if (!("sheets" in data)) throw new AttachmentError("Tệp này không phải bảng tính.");
  const sheet = data.sheets.find(s => s.name === v.sheet);
  if (!sheet || v.headerRow > sheet.rows.length) throw new AttachmentError("Sheet hoặc dòng tiêu đề không hợp lệ.");
  const index = (column: string) => { if (!/^[A-Z]{1,3}$/.test(column)) throw new AttachmentError("Cột dùng chữ A, B, C…"); const n = XLSX.utils.decode_col(column); if (n >= (sheet.rows[0]?.length ?? 0)) throw new AttachmentError("Cột ngoài phạm vi sheet."); return n; };
  const group = v.groupColumn === null ? null : index(v.groupColumn), value = v.valueColumn === null ? null : index(v.valueColumn);
  if (v.operation !== "count" && value === null) throw new AttachmentError("Chọn cột số cần tính.");
  const filters = v.filters.map(f => ({ index: index(f.column), value: f.equals.trim().toLocaleLowerCase("vi") }));
  const groups = new Map<string, { count: number; numbers: number; skipped: number; sum: number; min: number; max: number }>();
  let matched = 0;
  for (const row of sheet.rows.slice(v.headerRow)) {
    if (row.every(x => x === null || x === "") || filters.some(f => String(row[f.index] ?? "").trim().toLocaleLowerCase("vi") !== f.value)) continue;
    matched++;
    const key = group === null ? "Tất cả" : String(row[group] ?? "(trống)");
    const g = groups.get(key) ?? { count: 0, numbers: 0, skipped: 0, sum: 0, min: Infinity, max: -Infinity };
    g.count++;
    if (value !== null) { const n = numberValue(row[value]); if (n !== null && Number.isFinite(n)) { g.numbers++; g.sum += n; g.min = Math.min(g.min, n); g.max = Math.max(g.max, n); } else g.skipped++; }
    groups.set(key, g); if (groups.size > 100) throw new AttachmentError("Kết quả quá 100 nhóm; hãy thêm điều kiện lọc.");
  }
  const rows: Cell[][] = [...groups].map(([key, g]) => [key, g.count, v.operation === "count" ? g.count : !g.numbers ? null : v.operation === "sum" ? g.sum : v.operation === "average" ? g.sum / g.numbers : v.operation === "min" ? g.min : g.max, g.skipped]);
  if (rows.some(r => r.some(c => typeof c === "number" && !Number.isFinite(c)))) throw new AttachmentError("Kết quả số vượt phạm vi tính toán.");
  const label = (column: string) => `${String(sheet.rows[v.headerRow - 1][index(column)] ?? column).slice(0,120)} (${column})`;
  const operation = { count: "Đếm", sum: "Tổng", average: "Trung bình", min: "Nhỏ nhất", max: "Lớn nhất" }[v.operation];
  const filtersText = v.filters.length ? v.filters.map(f => `${label(f.column)} = ${f.equals}`).join("; ") : "không lọc";
  const note = `Xét toàn bộ ${sheet.rows.length - v.headerRow} dòng sau dòng ${v.headerRow}; khớp ${matched} dòng. ${operation}${v.valueColumn ? ` cột ${label(v.valueColumn)}` : ""}. Điều kiện: ${filtersText}.${sheet.formulas ? ` Dùng giá trị công thức đã lưu; ${sheet.missingFormulaValues} ô thiếu kết quả.` : ""}`;
  const table = { source: `${name} · ${sheet.name}`, columns: [v.groupColumn ? label(v.groupColumn) : "Phạm vi", "Số dòng", operation, "Ô bỏ qua (không phải số)"], rows, note };
  return { table, output: table };
}
