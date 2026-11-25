/* eslint-disable @typescript-eslint/no-require-imports -- Loaded by the CommonJS document worker. */
// Local PDF parsing/rendering only. No URL input, embedded JavaScript or external resources.
const path = require('node:path');
const { workerData } = require('node:worker_threads');
const AI_LIMITS = workerData.limits;
const fail = message => { throw new Error('USER:' + message); };
async function loadPdf(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false,
    useSystemFonts: false, useWorkerFetch: false, maxImageSize: AI_LIMITS.pdf.imagePixels,
    standardFontDataUrl: path.join(root, 'standard_fonts') + path.sep,
    cMapUrl: path.join(root, 'cmaps') + path.sep, cMapPacked: true,
    wasmUrl: path.join(root, 'wasm') + path.sep });
  try {
    const doc = await task.promise;
    if (doc.numPages > AI_LIMITS.pdf.maxPages) { await task.destroy(); fail(`PDF tối đa ${AI_LIMITS.pdf.maxPages} trang.`); }
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
    if (text.length > AI_LIMITS.pdf.pageChars) fail(`Trang PDF vượt ${AI_LIMITS.pdf.pageChars.toLocaleString("vi-VN")} ký tự; hãy chia nhỏ tài liệu.`);
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
    const viewport = page.getViewport({ scale: Math.min(AI_LIMITS.pdf.renderScale, AI_LIMITS.files.previewSide / Math.max(base.width, base.height)) });
    const { createCanvas } = require('@napi-rs/canvas');
    const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const image = canvas.toBuffer('image/png');
    if (image.length > AI_LIMITS.pdf.renderBytes) fail('Ảnh trang PDF quá lớn. Hãy dùng tệp nhỏ hơn.');
    return { page: number, totalPages: doc.numPages, text, image, needsVision: text.length < AI_LIMITS.pdf.visionThresholdChars };
  } finally { await close(); }
}
async function pdfTextPages(bytes) {
  const { doc, close } = await loadPdf(bytes);
  try {
    if (doc.numPages > AI_LIMITS.pdf.wordPages) fail(`Chuyển Word tối đa ${AI_LIMITS.pdf.wordPages} trang; dùng assemble_pdf để tách phần cần chuyển.`);
    const pages = []; let total = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const text = await pageText(await doc.getPage(n)); total += text.length;
      if (total > AI_LIMITS.pdf.wordChars) fail('Nội dung PDF quá dài để dựng Word; hãy chia tệp.');
      if (text.length < AI_LIMITS.pdf.visionThresholdChars) fail(`Trang ${n} ít hoặc không có lớp chữ. Đọc ảnh bằng read_pdf_page rồi truyền nội dung từng trang vào convert_pdf_to_word; không bỏ trang này.`);
      pages.push({ page: n, paragraphs: text.split('\n').filter(Boolean), tables: [] });
    }
    return pages;
  } finally { await close(); }
}
module.exports = { readPdfPage, pdfTextPages };
