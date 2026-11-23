/* eslint-disable @typescript-eslint/no-require-imports -- Loaded by the CommonJS document worker. */
// Local PDF parsing/rendering only. No URL input, embedded JavaScript or external resources.
const path = require('node:path');
const fail = message => { throw new Error('USER:' + message); };
async function loadPdf(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false,
    useSystemFonts: false, useWorkerFetch: false, maxImageSize: 16000000,
    standardFontDataUrl: path.join(root, 'standard_fonts') + path.sep,
    cMapUrl: path.join(root, 'cmaps') + path.sep, cMapPacked: true,
    wasmUrl: path.join(root, 'wasm') + path.sep });
  try {
    const doc = await task.promise;
    if (doc.numPages > 200) { await task.destroy(); fail('PDF tối đa 200 trang.'); }
    return { doc, close: () => task.destroy() };
  } catch (e) {
    if (e.message?.startsWith('USER:')) throw e;
    fail('Không đọc được PDF; tệp có thể bị lỗi hoặc có mật khẩu.');
  }
}
async function pageText(page) {
  const content = await page.getTextContent();
  let text = '', lastY = null;
  for (const item of content.items) {
    if (!('str' in item)) continue;
    const y = item.transform[5];
    if (lastY !== null && Math.abs(lastY - y) > 3 && !text.endsWith('\n')) text += '\n';
    text += item.str + (item.hasEOL ? '\n' : ' '); lastY = y;
    if (text.length > 30000) fail('Trang PDF vượt 30.000 ký tự; hãy chia nhỏ tài liệu.');
  }
  return text.trim();
}
async function readPdfPage(bytes, number) {
  const { doc, close } = await loadPdf(bytes);
  try {
    if (!Number.isInteger(number) || number < 1 || number > doc.numPages) fail('Số trang PDF không hợp lệ.');
    const page = await doc.getPage(number), text = await pageText(page);
    const base = page.getViewport({ scale: 1 });
    if (!Number.isFinite(base.width + base.height) || base.width <= 0 || base.height <= 0) fail('Kích thước trang PDF không hợp lệ.');
    const viewport = page.getViewport({ scale: Math.min(2, 2048 / Math.max(base.width, base.height)) });
    const { createCanvas } = require('@napi-rs/canvas');
    const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const image = canvas.toBuffer('image/png');
    if (image.length > 8 * 1024 * 1024) fail('Ảnh trang PDF quá lớn. Hãy dùng tệp nhỏ hơn.');
    return { page: number, totalPages: doc.numPages, text, image, needsVision: text.length < 20 };
  } finally { await close(); }
}
async function pdfTextPages(bytes) {
  const { doc, close } = await loadPdf(bytes);
  try {
    if (doc.numPages > 20) fail('Chuyển Word tối đa 20 trang; dùng assemble_pdf để tách phần cần chuyển.');
    const pages = []; let total = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const text = await pageText(await doc.getPage(n)); total += text.length;
      if (total > 100000) fail('Nội dung PDF quá dài để dựng Word; hãy chia tệp.');
      if (text.length < 20) fail(`Trang ${n} ít hoặc không có lớp chữ. Đọc ảnh bằng read_pdf_page rồi truyền nội dung từng trang vào convert_pdf_to_word; không bỏ trang này.`);
      pages.push({ page: n, paragraphs: text.split('\n').filter(Boolean), tables: [] });
    }
    return pages;
  } finally { await close(); }
}
module.exports = { readPdfPage, pdfTextPages };
