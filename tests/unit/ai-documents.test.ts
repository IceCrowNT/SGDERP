import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";
import { runDocumentWorker, convertOfficeToPdf, validateEditableOffice } from "../../src/lib/ai-document-runtime";
import { parseAttachment } from "../../src/lib/ai-attachment-parser";
import { zipFixture } from "../helpers/ai-file-fixtures";
const word = { filename: "bien-ban", title: "BIÊN BẢN BÀN GIAO", paragraphs: ["Phòng Hành chính Nhân sự", "Người nhận: {{name}}"], tables: [{ headers: ["Tài sản", "Số lượng"], rows: [["Máy in", "2"]] }] };
const sheet = { filename: "tai-san", sheets: [{ name: "Tài sản", rows: [["Tên", "Giá"], ["Máy in", 100], ["=WEBSERVICE(\"x\")", 25]] }] };
test("Word creation and template patch preserve Vietnamese and original", async () => {
  const created = await runDocumentWorker("create_word_file", word); const original = Buffer.from(created.bytes!);
  const updated = await runDocumentWorker("fill_word_template", { replacements: [{ placeholder: "name", value: "Nguyễn Văn Nam" }] }, [{ bytes: original }]);
  const source = await parseAttachment(original, "source.docx"), result = await parseAttachment(Buffer.from(updated.bytes!), "result.docx");
  assert.match(JSON.stringify(source.data), /\{\{name\}\}/); assert.match(JSON.stringify(result.data), /Nguyễn Văn Nam/); assert.match(JSON.stringify(result.data), /Máy in/);
});
test("Excel edits check old values and keep formula-like strings inert", async () => {
  const created = await runDocumentWorker("create_excel_file", sheet), source = Buffer.from(created.bytes!);
  const wb = XLSX.read(source); assert.equal(wb.Sheets["Tài sản"].A3.t, "s"); assert.equal(wb.Sheets["Tài sản"].A3.f, undefined);
  const changes = [{ cell: "B2", expected: 100, value: 150, formula: null }];
  const edited = await runDocumentWorker("update_excel_cells", { sheet: "Tài sản", changes }, [{ bytes: source }]);
  assert.equal(XLSX.read(Buffer.from(edited.bytes!)).Sheets["Tài sản"].B2.v, 150); assert.equal(XLSX.read(source).Sheets["Tài sản"].B2.v, 100);
  await assert.rejects(runDocumentWorker("update_excel_cells", { sheet: "Tài sản", changes: [{ ...changes[0], expected: 99 }] }, [{ bytes: source }]), /không khớp/);
  await assert.rejects(runDocumentWorker("update_excel_cells", { sheet: "Tài sản", changes: [{ ...changes[0], formula: 'WEBSERVICE("https://example.com")' }] }, [{ bytes: source }]), /Công thức/);
  const formula = await runDocumentWorker("update_excel_cells", { sheet: "Tài sản", changes: [{ cell: "B4", expected: null, value: null, formula: "SUM(B2:B3)" }] }, [{ bytes: source }]);
  assert.equal(XLSX.read(Buffer.from(formula.bytes!),{sheetStubs:true}).Sheets["Tài sản"].B4.f, "SUM(B2:B3)");
});
test("PDF fields support Unicode, original stays unchanged; pages can be assembled", async () => {
  const doc = await PDFDocument.create(); const page = doc.addPage([400,500]); doc.addPage([300,400]);
  const form = doc.getForm(), field = form.createTextField("nguoi_nhan"); field.setText("Original"); field.addToPage(page,{x:20,y:200,width:200,height:30});
  const original = Buffer.from(await doc.save());
  const inspected = await parseAttachment(original,"form.pdf"); assert.equal(inspected.data.kind,"pdf");
  const edited = await runDocumentWorker("fill_pdf_form", {fields:[{name:"nguoi_nhan",value:"Nguyễn Hoàng Nam"}],flatten:false},[{bytes:original}]);
  assert.equal((await PDFDocument.load(edited.bytes!)).getForm().getTextField("nguoi_nhan").getText(),"Nguyễn Hoàng Nam");
  assert.equal((await PDFDocument.load(original)).getForm().getTextField("nguoi_nhan").getText(),"Original");
  const merged = await runDocumentWorker("assemble_pdf",{sources:[{pages:[2,1]}]},[{bytes:original}]);
  assert.deepEqual((await PDFDocument.load(merged.bytes!)).getPages().map(p=>p.getWidth()),[300,400]);
  await assert.rejects(runDocumentWorker("assemble_pdf",{sources:[{pages:[3]}]},[{bytes:original}]),/Số trang/);
});
test("Office links, embedded content and advanced workbooks are rejected before editing", async () => {
  const external=zipFixture({"word/document.xml":"<x/>","word/_rels/document.xml.rels":'<Relationship TargetMode="External" Target="file:///etc/passwd"/>'});
  await assert.rejects(validateEditableOffice(external,"docx"),/liên kết ngoài/);
  const encoded=zipFixture({"word/document.xml":"<x/>","word/_rels/document.xml.rels":'<Relationship TargetMode="Ext&#101;rnal" Target="file:///etc/passwd"/>'});
  await assert.rejects(validateEditableOffice(encoded,"docx"),/liên kết ngoài/);
  const formula=zipFixture({"xl/workbook.xml":"<x/>","xl/worksheets/sheet1.xml":'<worksheet><c><f>WEBSERVICE("https://example.com")</f></c></worksheet>'});
  await assert.rejects(validateEditableOffice(formula,"xlsx"),/liên kết ngoài/);
  const chart=zipFixture({"xl/workbook.xml":"<x/>","xl/charts/chart1.xml":"<x/>"});
  await assert.rejects(validateEditableOffice(chart,"xlsx",true),/cấu trúc nâng cao/);
});
test("LibreOffice produces real PDFs from Word and Excel", { skip: process.env.TEST_LIBREOFFICE !== "1", timeout: 120000 }, async () => {
  await mkdir("outputs/ai-document-tools/qa",{recursive:true});
  for(const [name,input,kind] of [["create_word_file",word,"docx"],["create_excel_file",sheet,"xlsx"]] as const) {
    const created=await runDocumentWorker(name,input),bytes=Buffer.from(created.bytes!);
    const pdf=await convertOfficeToPdf(bytes,kind); assert.equal(pdf.subarray(0,5).toString(),"%PDF-"); assert.ok((await PDFDocument.load(pdf)).getPageCount()>0);
    await writeFile(`outputs/ai-document-tools/qa/sample.${kind}`,bytes); await writeFile(`outputs/ai-document-tools/qa/${kind}.pdf`,pdf);
  }
});
