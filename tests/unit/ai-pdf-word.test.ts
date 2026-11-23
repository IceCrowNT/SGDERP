import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from "docx";
import { runDocumentWorker, convertOfficeToPdf, validateEditableOffice } from "../../src/lib/ai-document-runtime";
import { parseAttachment } from "../../src/lib/ai-attachment-parser";
import { DocumentSchemas } from "../../src/lib/ai-document-tools";
import { PdfPageReadSchema } from "../../src/lib/ai-attachments";

async function nativePdf() {
  const d=await PDFDocument.create(), font=await d.embedFont(StandardFonts.Helvetica);
  d.addPage([420,595]).drawText('Quotation: Toner quantity 20; unit price 100; total 2000.',{font,size:12,x:20,y:520});
  return Buffer.from(await d.save());
}
async function docText(bytes: Uint8Array) { return JSON.stringify((await parseAttachment(Buffer.from(bytes),'result.docx')).data); }
test('PDF native text and page rendering, bounds and invalid input',async()=>{
  const bytes=await nativePdf(), r=await runDocumentWorker('read_pdf_page',{page:1},[{bytes}]);
  assert.match(r.pdfPage!.text,/quantity 20/);assert.equal(r.pdfPage!.totalPages,1);
  assert.equal(Buffer.from(r.pdfPage!.image).subarray(1,4).toString(),'PNG');assert.equal(r.pdfPage!.needsVision,false);
  await assert.rejects(runDocumentWorker('read_pdf_page',{page:2},[{bytes}]),/Số trang/);
  await assert.rejects(runDocumentWorker('read_pdf_page',{page:1},[{bytes:Buffer.from('not pdf')}]),/Không đọc được PDF/);
  assert.equal(PdfPageReadSchema.safeParse({fileId:1,page:0}).success,false);
});
test('native PDF converts to editable Word with all text',async()=>{
  const bytes=await nativePdf(), result=await runDocumentWorker('convert_pdf_to_word',{pages:null},[{bytes}]);
  assert.equal(result.extension,'docx');assert.match(await docText(result.bytes!),/quantity 20/);
  await validateEditableOffice(Buffer.from(result.bytes!),'docx');
});
test('scan produces image for vision, refuses silent omission, supports reconstructed table',async()=>{
  const native=await nativePdf(), preview=await runDocumentWorker('read_pdf_page',{page:1},[{bytes:native}]);
  const scan=await PDFDocument.create(),img=await scan.embedPng(preview.pdfPage!.image);
  scan.addPage([420,595]).drawImage(img,{x:0,y:0,width:420,height:595});const bytes=Buffer.from(await scan.save());
  const read=await runDocumentWorker('read_pdf_page',{page:1},[{bytes}]);assert.equal(read.pdfPage!.text,'');assert.equal(read.pdfPage!.needsVision,true);
  await assert.rejects(runDocumentWorker('convert_pdf_to_word',{pages:null},[{bytes}]),/Trang 1/);
  const pages=[{page:1,paragraphs:['BÁO GIÁ'],tables:[{headers:['Vật tư','Số lượng','Đơn giá','Thành tiền'],rows:[['Mực in','20','100','2000']]}]}];
  const converted=await runDocumentWorker('convert_pdf_to_word',{pages},[{bytes}]);
  assert.match(await docText(converted.bytes!),/Mực in/);
  await assert.rejects(runDocumentWorker('convert_pdf_to_word',{pages:[{...pages[0],page:2}]},[{bytes}]),/đủ trang/);
  await mkdir('outputs/ai-pdf-20261123',{recursive:true});
  await writeFile('outputs/ai-pdf-20261123/scan.pdf',bytes);
  await writeFile('outputs/ai-pdf-20261123/rebuilt.docx',converted.bytes!);
});
test('Word replacement spans runs and edits table cells without touching source',async()=>{
  const original=await Packer.toBuffer(new Document({sections:[{children:[new Paragraph({children:[new TextRun({text:'Số lượng: ',bold:true}),new TextRun('20 lọ')]}),new Table({rows:[new TableRow({children:[new TableCell({children:[new Paragraph('Thành tiền: 2000')]})]})]})]}]}));
  const changes=[{expected:'Số lượng: 20 lọ',replacement:'Số lượng: 10 lọ',occurrences:1},{expected:'Thành tiền: 2000',replacement:'Thành tiền: 1000',occurrences:1}];
  const result=await runDocumentWorker('update_word_text',{changes},[{bytes:original}]);
  assert.match(await docText(result.bytes!),/10 lọ/);assert.match(await docText(result.bytes!),/Thành tiền: 1000/);
  assert.match(await docText(original),/20 lọ/);await validateEditableOffice(Buffer.from(result.bytes!),'docx');
  await assert.rejects(runDocumentWorker('update_word_text',{changes:[{...changes[0],occurrences:2}]},[{bytes:original}]),/khớp 1 lần/);
  await assert.rejects(runDocumentWorker('update_word_text',{changes:[{...changes[0],expected:'missing'}]},[{bytes:original}]),/khớp 0 lần/);
  assert.equal(DocumentSchemas.update_word_text.safeParse({filename:'x',fileId:1,changes:[{...changes[0],occurrences:0}]}).success,false);
});
test('repeated text across runs preserves earlier offsets and escapes XML',async()=>{
  const original=await Packer.toBuffer(new Document({sections:[{children:[new Paragraph({children:[new TextRun('XX '),new TextRun('X'),new TextRun('X')]} )]}]}));
  const result=await runDocumentWorker('update_word_text',{changes:[{expected:'XX',replacement:'A & <B>',occurrences:2}]},[{bytes:original}]);
  assert.match(await docText(result.bytes!),/A & <B> A & <B>/);
});
test('PDF -> Word -> edit -> PDF keeps corrected numbers and Vietnamese', {skip:process.env.TEST_LIBREOFFICE!=='1',timeout:120000},async()=>{
  const original=await nativePdf();
  const converted=await runDocumentWorker('convert_pdf_to_word',{pages:[{page:1,paragraphs:['BÁO GIÁ MỰC IN','Số lượng: 20 lọ','Đơn giá: 100','Thành tiền: 2000'],tables:[]}]},[{bytes:original}]);
  const edited=await runDocumentWorker('update_word_text',{changes:[{expected:'Số lượng: 20 lọ',replacement:'Số lượng: 10 lọ',occurrences:1},{expected:'Thành tiền: 2000',replacement:'Thành tiền: 1000',occurrences:1}]},[{bytes:Buffer.from(converted.bytes!)}]);
  const pdf=await convertOfficeToPdf(Buffer.from(edited.bytes!),'docx');
  const rendered=await runDocumentWorker('read_pdf_page',{page:1},[{bytes:pdf}]);
  assert.match(rendered.pdfPage!.text,/10 lọ/);assert.match(rendered.pdfPage!.text,/1000/);assert.doesNotMatch(rendered.pdfPage!.text,/20 lọ/);
  await writeFile('outputs/ai-pdf-20261123/edited.pdf',pdf);await writeFile('outputs/ai-pdf-20261123/edited.png',rendered.pdfPage!.image);
});
