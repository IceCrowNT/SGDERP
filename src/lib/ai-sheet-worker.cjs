/* eslint-disable @typescript-eslint/no-require-imports -- Node worker entry point is CommonJS. */
// Only parses a bounded workbook. No model-generated code, macros or network access.
const { parentPort, workerData } = require('node:worker_threads');
// Cấu hình duy nhất từ ai-config.ts, được backend truyền vào khi tạo worker.
const AI_LIMITS = workerData.limits;
const XLSX = require('xlsx');
try {
  const buffer = Buffer.from(workerData.buffer), kind = workerData.kind;
  let workbook;
  if (kind === 'csv') {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    if (text.includes('\0')) throw Error('CSV phải dùng UTF-8.');
    workbook = XLSX.read(text, { type: 'string', raw: true, cellFormula: false });
  } else workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellFormula: true, bookVBA: false });
  if (workbook.SheetNames.length > AI_LIMITS.sheets.maxSheets) throw Error(`Tối đa ${AI_LIMITS.sheets.maxSheets} sheet trong một tệp.`);
  let cells = 0, totalRows = 0;
  const sheets = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name], range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const height = range.e.r + 1, width = range.e.c + 1;
    totalRows += height; cells += height * width;
    if (totalRows > AI_LIMITS.sheets.maxRows || cells > AI_LIMITS.sheets.maxCells || width > AI_LIMITS.sheets.maxColumns) throw Error(`Bảng tính vượt ${AI_LIMITS.sheets.maxRows.toLocaleString("vi-VN")} dòng, ${AI_LIMITS.sheets.maxCells.toLocaleString("vi-VN")} ô hoặc ${AI_LIMITS.sheets.maxColumns} cột. Hãy chia tệp.`);
    let formulas = 0, missingFormulaValues = 0;
    const rows = Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.f) { formulas++; if (cell.v == null) missingFormulaValues++; }
      if (!cell || cell.v == null) return null;
      if (cell.t === 'n' && typeof cell.v === 'number' && Number.isFinite(cell.v)) return cell.v;
      const value = cell.v instanceof Date ? cell.v.toISOString() : String(cell.v);
      if (value.length > AI_LIMITS.sheets.cellChars) throw Error(`Một ô vượt ${AI_LIMITS.sheets.cellChars.toLocaleString("vi-VN")} ký tự. Hãy chia nội dung ô.`);
      return value;
    }));
    return { name, rows, formulas, missingFormulaValues };
  });
  if (JSON.stringify(sheets).length > AI_LIMITS.sheets.extractedChars) throw Error('Nội dung bảng tính quá lớn sau trích xuất. Hãy chia tệp.');
  parentPort.postMessage({ sheets });
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  parentPort.postMessage({ error: /^(Tối đa|Bảng tính vượt|Một ô vượt|Nội dung bảng tính|CSV phải)/.test(message) ? message : 'Không đọc được bảng tính. Dùng XLSX không mật khẩu hoặc CSV UTF-8.' });
}
