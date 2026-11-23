// Only parses a bounded workbook. No model-generated code, macros or network access.
const { parentPort, workerData } = require('node:worker_threads');
const XLSX = require('xlsx');
try {
  const buffer = Buffer.from(workerData.buffer), kind = workerData.kind;
  let workbook;
  if (kind === 'csv') {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    if (text.includes('\0')) throw Error('CSV phải dùng UTF-8.');
    workbook = XLSX.read(text, { type: 'string', raw: true, cellFormula: false });
  } else workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellFormula: true, bookVBA: false });
  if (workbook.SheetNames.length > 20) throw Error('Tối đa 20 sheet trong một tệp.');
  let cells = 0, totalRows = 0;
  const sheets = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name], range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const height = range.e.r + 1, width = range.e.c + 1;
    totalRows += height; cells += height * width;
    if (totalRows > 100000 || cells > 200000 || width > 256) throw Error('Bảng tính vượt 100.000 dòng, 200.000 ô hoặc 256 cột. Hãy chia tệp.');
    let formulas = 0, missingFormulaValues = 0;
    const rows = Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.f) { formulas++; if (cell.v == null) missingFormulaValues++; }
      if (!cell || cell.v == null) return null;
      if (cell.t === 'n' && typeof cell.v === 'number' && Number.isFinite(cell.v)) return cell.v;
      const value = cell.v instanceof Date ? cell.v.toISOString() : String(cell.v);
      if (value.length > 10000) throw Error('Một ô vượt 10.000 ký tự. Hãy chia nội dung ô.');
      return value;
    }));
    return { name, rows, formulas, missingFormulaValues };
  });
  if (JSON.stringify(sheets).length > 5000000) throw Error('Nội dung bảng tính quá lớn sau trích xuất. Hãy chia tệp.');
  parentPort.postMessage({ sheets });
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  parentPort.postMessage({ error: /^(Tối đa|Bảng tính vượt|Một ô vượt|Nội dung bảng tính|CSV phải)/.test(message) ? message : 'Không đọc được bảng tính. Dùng XLSX không mật khẩu hoặc CSV UTF-8.' });
}
