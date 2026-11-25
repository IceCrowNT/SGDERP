/* eslint-disable @typescript-eslint/no-require-imports -- Node worker entry point is CommonJS. */
const { parentPort, workerData } = require('node:worker_threads');
// Cấu hình duy nhất từ ai-config.ts, được backend truyền vào khi tạo worker.
const AI_LIMITS = workerData.limits;
const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, patchDocument, PatchType } = require('docx');
const ExcelJS = require('exceljs');
const { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup } = require('pdf-lib');
const fail = message => { throw new Error('USER:' + message); };
const formulaSafe = formula => {
  const f = formula.replace(/^=/, '').toUpperCase();
  // No URLs, external workbook/sheet references, string literals, DDE or arbitrary function names.
  if (!/^[A-Z0-9_+\-*/^%().,: $]+$/.test(f)) return false;
  if ([...f.matchAll(/([A-Z_][A-Z_0-9]*)\s*\(/g)].some(m => !['SUM','AVERAGE','MIN','MAX','COUNT'].includes(m[1]))) return false;
  return !/[A-Z_]/.test(f.replace(/\b(SUM|AVERAGE|MIN|MAX|COUNT)\s*\(/g, '(').replace(/\$?[A-Z]{1,3}\$?[1-9][0-9]*/g, '1'));
};
const cellValue = c => {
  const v = c.value;
  if (v == null) return null;
  if (typeof v !== 'object') return v;
  if ('formula' in v || 'sharedFormula' in v) return v.result ?? null;
  if (v instanceof Date) return v.toISOString();
  if ('richText' in v) return v.richText.map(x => x.text).join('');
  fail('Ô có dữ liệu phức tạp chưa được hỗ trợ sửa.');
};
(async () => {
  const { name, input: v } = workerData, sources = (workerData.sources || []).map(x => ({...x, bytes: Buffer.from(x.bytes)}));
  let bytes, note = '', extension;
  if (name === 'read_pdf_page') {
    const pdfPage = await require('./ai-pdf-worker.cjs').readPdfPage(sources[0].bytes, v.page);
    parentPort.postMessage({ pdfPage }); return;
  } else if (name === 'convert_pdf_to_word') {
    const source = await PDFDocument.load(sources[0].bytes), count = source.getPageCount();
    if (count > AI_LIMITS.pdf.wordPages) fail(`Chuyển Word tối đa ${AI_LIMITS.pdf.wordPages} trang; hãy tách phần cần chuyển.`);
    const pages = v.pages ?? await require('./ai-pdf-worker.cjs').pdfTextPages(sources[0].bytes);
    if (pages.length !== count || pages.some((p,i) => p.page !== i+1)) fail('Nội dung phải có đủ trang PDF, theo thứ tự 1 đến trang cuối.');
    const sections = pages.map(p => {
      const children = p.paragraphs.map(text => new Paragraph({ text }));
      for (const t of p.tables) {
        if (t.rows.some(r => r.length !== t.headers.length)) fail('Số ô bảng Word không khớp tiêu đề.');
        children.push(new Table({ width: {size:100,type:WidthType.PERCENTAGE}, rows: [t.headers,...t.rows].map((r,i) => new TableRow({tableHeader:i===0,children:r.map(text=>new TableCell({children:[new Paragraph({children:[new TextRun({text,bold:i===0})]})]}))})) }));
      }
      if (!children.length) fail(`Trang ${p.page} chưa có nội dung; kiểm tra ảnh trước khi dựng Word.`);
      return { children };
    });
    bytes = await Packer.toBuffer(new Document({styles:{default:{document:{run:{font:'Arial',size:22}}}},sections})); extension='docx';
    note = v.pages === null ? 'Dựng Word từ lớp chữ PDF; không giữ bố cục/bảng/ảnh nguồn. Kiểm tra bản dựng trước khi sử dụng.' : 'Dựng Word từ nội dung các trang PDF đã đọc; bố cục, ảnh và số trang có thể khác bản gốc. Nội dung nhận diện cần được kiểm tra.';
  } else if (name === 'update_word_text') {
    bytes = await require('./ai-word-edit-worker.cjs').replaceWordText(sources[0].bytes, v.changes); extension='docx';
    note = `Đã áp dụng ${v.changes.length} thay đổi văn bản trong thân Word; giữ nguồn và cấu trúc bảng. Chữ thay lấy định dạng run đầu; cần kiểm tra trang in.`;
  } else if (name === 'create_word_file') {
    if (!v.title.trim() && !v.paragraphs.some(x => x.trim()) && !v.tables.length) fail('Tài liệu Word không có nội dung.');
    const children = [...(v.title ? [new Paragraph({text:v.title, heading:HeadingLevel.TITLE})] : []), ...v.paragraphs.map(text => new Paragraph({text}))];
    for (const table of v.tables) {
      if (table.rows.some(r => r.length !== table.headers.length)) fail('Số ô trong bảng Word không khớp tiêu đề.');
      children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({tableHeader:true,children:table.headers.map(t => new TableCell({children:[new Paragraph({children:[new TextRun({text:t,bold:true})]})]}))}),...table.rows.map(r => new TableRow({children:r.map(t=>new TableCell({children:[new Paragraph(t)]}))}))]}));
    }
    bytes = await Packer.toBuffer(new Document({styles:{default:{document:{run:{font:'Arial',size:22}}}}, sections:[{children}]})); extension='docx'; note='Tạo Word mới từ nội dung yêu cầu.';
  } else if (name === 'fill_word_template') {
    const patches = {};
    for (const r of v.replacements) { if (Object.hasOwn(patches,r.placeholder) || ['__proto__','constructor','prototype'].includes(r.placeholder)) fail('Tên placeholder trùng hoặc không hợp lệ.'); patches[r.placeholder]={type:PatchType.PARAGRAPH,children:[new TextRun(r.value)]}; }
    bytes = await patchDocument({outputType:'nodebuffer',data:sources[0].bytes,patches,keepOriginalStyles:true}); extension='docx'; note=`Đã điền ${v.replacements.length} mục trong mẫu; giữ bản gốc.`;
  } else if (name === 'create_excel_file' || name === 'update_excel_cells') {
    const book = new ExcelJS.Workbook();
    if (name === 'create_excel_file') {
      let cells=0; const names=new Set();
      for (const s of v.sheets) {
        if (/[\\/*?:\[\]]/.test(s.name) || names.has(s.name.toLowerCase())) fail('Tên sheet không hợp lệ hoặc trùng.'); names.add(s.name.toLowerCase());
        cells += s.rows.reduce((n,r)=>n+r.length,0); if (cells>AI_LIMITS.documents.cells) fail(`Tệp mới tối đa ${AI_LIMITS.documents.cells.toLocaleString("vi-VN")} ô.`);
        const sheet=book.addWorksheet(s.name); sheet.addRows(s.rows); sheet.getRow(1).font={bold:true}; sheet.views=[{state:'frozen',ySplit:1}];
        for(const col of sheet.columns) col.width=22;
        sheet.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
      }
      note='Tạo bảng tính mới; dữ liệu dạng chữ không được chạy như công thức.';
    } else {
      await book.xlsx.load(sources[0].bytes); const sheet=book.getWorksheet(v.sheet); if(!sheet) fail('Sheet không tồn tại.');
      const addresses=new Set();
      for (const change of v.changes) {
        if(addresses.has(change.cell)) fail('Một ô được yêu cầu sửa nhiều lần.'); addresses.add(change.cell);
        const c=sheet.getCell(change.cell); if(c.row>AI_LIMITS.sheets.maxRows||c.col>AI_LIMITS.sheets.maxColumns) fail(`Ô vượt giới hạn ${AI_LIMITS.sheets.maxRows.toLocaleString("vi-VN")} dòng/${AI_LIMITS.sheets.maxColumns} cột.`);
        if(c.isMerged) fail('Chưa hỗ trợ sửa ô gộp; hãy chọn ô thường.');
        if(!Object.is(cellValue(c),change.expected)) fail(`Giá trị hiện tại của ô ${change.cell} không khớp; đọc lại trước khi sửa.`);
        if(change.formula!==null) {if(!formulaSafe(change.formula)) fail('Công thức có hàm hoặc tham chiếu chưa được hỗ trợ.'); c.value={formula:change.formula.replace(/^=/,'')};}
        else c.value=change.value;
      }
      book.calcProperties.fullCalcOnLoad=true; note=`Đã sửa ${v.changes.length} ô tại sheet ${v.sheet}; giữ bản gốc. Công thức cần được tính lại khi mở bằng ứng dụng bảng tính.`;
    }
    bytes=Buffer.from(await book.xlsx.writeBuffer()); extension='xlsx';
  } else if (name === 'inspect_pdf' || name === 'fill_pdf_form') {
    const doc=await PDFDocument.load(sources[0].bytes); if(doc.getPageCount()>AI_LIMITS.pdf.maxPages) fail(`PDF tối đa ${AI_LIMITS.pdf.maxPages} trang.`); const form=doc.getForm();
    if(name==='inspect_pdf') {
      const fields=form.getFields().map(f=>({name:f.getName(),type:f.constructor.name,...(f instanceof PDFTextField?{value:f.getText()??''}:f instanceof PDFCheckBox?{value:f.isChecked()}:f instanceof PDFDropdown||f instanceof PDFOptionList||f instanceof PDFRadioGroup?{options:f.getOptions(),value:f.getSelected()}: {})}));
      if(JSON.stringify(fields).length>AI_LIMITS.pdf.formChars) fail('PDF có quá nhiều dữ liệu biểu mẫu.');
      parentPort.postMessage({pdf:{pages:doc.getPageCount(),fields}});return;
    }
    let font;
    if(workerData.fontBytes) {doc.registerFontkit(require('@pdf-lib/fontkit')); font=await doc.embedFont(Buffer.from(workerData.fontBytes),{subset:true});}
    for(const entry of v.fields) {
      const f=form.getField(entry.name); if(f.isReadOnly()) fail('Trường PDF chỉ đọc.');
      if(f instanceof PDFCheckBox && typeof entry.value==='boolean') { if(entry.value)f.check();else f.uncheck(); }
      else if(f instanceof PDFTextField && typeof entry.value==='string') {if(!font && /[^\x20-\x7E\r\n\t]/.test(entry.value)) fail('Máy chủ thiếu font Unicode. Cấu hình PDF_FONT_PATH hoặc tạo Word và xuất PDF.'); f.setText(entry.value);}
      else if((f instanceof PDFDropdown||f instanceof PDFOptionList||f instanceof PDFRadioGroup)&&typeof entry.value==='string'&&f.getOptions().includes(entry.value)) f.select(entry.value);
      else fail('Kiểu hoặc giá trị trường PDF không phù hợp.');
    }
    if(font)form.updateFieldAppearances(font);
    if(v.flatten)form.flatten(); bytes=Buffer.from(await doc.save());extension='pdf';note=`Đã điền ${v.fields.length} trường PDF${v.flatten?' và chốt biểu mẫu':''}; giữ bản gốc.`;
  } else if(name==='assemble_pdf') {
    const doc=await PDFDocument.create();let count=0;
    for(let i=0;i<sources.length;i++) {const src=await PDFDocument.load(sources[i].bytes),pages=v.sources[i].pages;count+=pages.length;if(count>AI_LIMITS.pdf.maxPages||pages.some(p=>p>src.getPageCount()))fail(`Số trang PDF không hợp lệ hoặc vượt ${AI_LIMITS.pdf.maxPages} trang.`);for(const p of await doc.copyPages(src,pages.map(p=>p-1)))doc.addPage(p);}
    bytes=Buffer.from(await doc.save());extension='pdf';note=`Đã tạo PDF ${count} trang từ các trang được chọn; không giữ trường biểu mẫu tương tác.`;
  } else fail('Công cụ tài liệu chưa được hỗ trợ.');
  if(bytes.length>AI_LIMITS.files.maxBytes)fail(`Tệp kết quả vượt ${AI_LIMITS.files.maxBytes / 1024 / 1024} MiB. Hãy chia yêu cầu.`);
  parentPort.postMessage({bytes,extension,note});
})().catch(e=>parentPort.postMessage({error:e.message?.startsWith('USER:')?e.message.slice(5):'Không xử lý được tài liệu. Kiểm tra định dạng, trường biểu mẫu hoặc chia nhỏ yêu cầu.'}));
