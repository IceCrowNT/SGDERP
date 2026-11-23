// Explicit external imports let Next trace the worker packages and their dependencies.
import "docx";
import "exceljs";
import "pdf-lib";
import "@pdf-lib/fontkit";
import "jszip";
import "@xmldom/xmldom";
import "@napi-rs/canvas";
import path from "node:path";
import os from "node:os";
import { Worker } from "node:worker_threads";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdtemp, mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import yauzl from "yauzl";
import { AttachmentError, validateOfficeZip } from "./ai-attachment-parser";
export type PdfInfo = { pages: number; fields: { name: string; type: string; value?: string | boolean | string[]; options?: string[] }[] };
export type DocumentWorkerResult = { bytes?: Uint8Array; extension?: string; note?: string; pdf?: PdfInfo; pdfPage?: { page: number; totalPages: number; text: string; image: Uint8Array; needsVision: boolean }; error?: string };
export async function runDocumentWorker(name: string, input: unknown, sources: { bytes: Buffer }[] = []): Promise<DocumentWorkerResult> {
  let fontBytes: Buffer | undefined;
  if (name === "fill_pdf_form") {
    const candidates = [process.env.PDF_FONT_PATH, path.join(os.homedir(), "Applications/LibreOffice.app/Contents/Resources/fonts/truetype/NotoSans-Regular.ttf"), "/Applications/LibreOffice.app/Contents/Resources/fonts/truetype/NotoSans-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"].filter((x): x is string => Boolean(x));
    for(const file of candidates) {try {fontBytes=await readFile(file);break;}catch{/* try next */}}
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), "src/lib/ai-document-worker.cjs"), { workerData: { name, input, sources, fontBytes }, resourceLimits: { maxOldGenerationSizeMb: 256 } });
    let settled = false;
    const end = (result?: DocumentWorkerResult) => { if(settled)return;settled=true;clearTimeout(timer);void worker.terminate(); if(!result||result.error)reject(new AttachmentError(result?.error??"Đọc/ghi tài liệu vượt giới hạn thời gian hoặc bộ nhớ. Hãy chia nhỏ yêu cầu."));else resolve(result); };
    const timer = setTimeout(() => end(), 30000);
    worker.once("message", end);worker.once("error", () => end());worker.once("exit", () => { if(!settled)end(); });
  });
}
// Conversion/editing must not activate links, macros, embedded objects or external data.
export async function validateEditableOffice(bytes: Buffer, kind: "docx" | "xlsx", simpleWorkbook = false) {
  await validateOfficeZip(bytes, kind);
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if(error||!zip)return reject(new AttachmentError("Tệp Office không hợp lệ."));
      let done=false;
      const fail=()=>{if(!done){done=true;zip.close();reject(new AttachmentError("Tệp có liên kết ngoài, đối tượng nhúng hoặc cấu trúc nâng cao chưa hỗ trợ chỉnh/xuất. Hãy dùng bản chỉ có nội dung và bảng dữ liệu."));}};
      zip.on("error",fail);zip.on("end",()=>{if(!done){done=true;resolve();}});
      zip.on("entry",entry=>{
        if(/externalLinks|connections\.xml|embeddings|vba|activeX/i.test(entry.fileName)||(simpleWorkbook&&/charts|drawings|pivot|slicer/i.test(entry.fileName)))return fail();
        if(!/\.(xml|rels)$/i.test(entry.fileName)){zip.readEntry();return;}
        zip.openReadStream(entry,(err,stream)=>{if(err||!stream)return fail();const chunks:Buffer[]=[];stream.on("error",fail);stream.on("data",chunk=>chunks.push(chunk));stream.on("end",()=>{
          const xml=Buffer.concat(chunks).toString("utf8");
          const unsafeXml = /TargetMode\s*=\s*["']External|<!DOCTYPE|<!ENTITY|<(?:[\w.-]+:)?(?:altChunk|instrText|fldSimple)\b/i.test(xml);
          const encodedRelationship = /\.rels$/i.test(entry.fileName) && /&#/.test(xml);
          const formulas = [...xml.matchAll(/<(?:[\w.-]+:)?f(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?f>/g)];
          const unsafeFormula = formulas.some(match => /&#|\[|\]|\||WEBSERVICE\s*\(|RTD\s*\(|HYPERLINK\s*\(|DDE\s*\(/i.test(match[1]));
          if (unsafeXml || encodedRelationship || unsafeFormula) return fail();
          if(!done)zip.readEntry();
        });});
      });zip.readEntry();
    });
  });
}
const exec = promisify(execFile);
export async function officeExecutable() {
  const candidates = process.env.LIBREOFFICE_PATH ? [process.env.LIBREOFFICE_PATH] : [path.join(os.homedir(),"Applications/LibreOffice.app/Contents/MacOS/soffice"),"/Applications/LibreOffice.app/Contents/MacOS/soffice","/usr/bin/libreoffice","/usr/bin/soffice"];
  for(const candidate of candidates) {try{await access(candidate);return candidate;}catch{ /* try next */ }}
  throw new AttachmentError("Máy chủ chưa có LibreOffice. Cấu hình LIBREOFFICE_PATH để xuất PDF.");
}
export async function convertOfficeToPdf(bytes: Buffer, kind: "docx"|"xlsx") {
  await validateEditableOffice(bytes,kind);
  const executable=await officeExecutable(), folder=await mkdtemp(path.join(os.tmpdir(),"sdg-ai-office-"));
  try {
    const profile=path.join(folder,"profile"),user=path.join(profile,"user"),out=path.join(folder,"out");await mkdir(user,{recursive:true});await mkdir(out);
    await writeFile(path.join(user,"registrymodifications.xcu"),'<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>2</value></prop></item></oor:items>',{mode:0o600});
    const source=path.join(folder,`source.${kind}`);await writeFile(source,bytes,{mode:0o600});
    const args=[`-env:UserInstallation=${pathToFileURL(profile).href}`,"--headless","--nologo","--nodefault","--norestore","--convert-to",kind==="docx"?"pdf:writer_pdf_Export":"pdf:calc_pdf_Export","--outdir",out,source];
    // Never inherit ERP credentials into the office process. macOS also blocks network access.
    const env={NODE_ENV: process.env.NODE_ENV ?? "production",PATH:"/usr/bin:/bin",HOME:folder,TMPDIR:folder,LANG:"en_US.UTF-8"};
    if(process.platform==="darwin")await exec("/usr/bin/sandbox-exec",["-p","(version 1)(allow default)(deny network-outbound (remote ip \"*:*\"))",executable,...args],{env,timeout:45000,killSignal:"SIGKILL",maxBuffer:32768});
    else await exec(executable,args,{env,timeout:45000,killSignal:"SIGKILL",maxBuffer:32768});
    const output=path.join(out,"source.pdf");if((await stat(output)).size>10485760)throw new AttachmentError("PDF kết quả vượt 10 MiB.");
    return await readFile(output);
  } catch(error) {if(error instanceof AttachmentError)throw error;throw new AttachmentError("Không xuất được PDF. Kiểm tra LibreOffice hoặc chia nhỏ tài liệu; thời gian xử lý tối đa 45 giây.");}
  finally {await rm(folder,{recursive:true,force:true});}
}
