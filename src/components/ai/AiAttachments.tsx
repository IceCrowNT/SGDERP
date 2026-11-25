"use client";
import { AI_LIMITS } from "@/lib/ai-config";
import { useEffect, useImperativeHandle, useRef, useState, type Ref, type ReactNode } from "react";
import { Paperclip, Loader2, X, FileText, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { AI_FILE_ACCEPT, type AiAttachment, type AttachmentTable } from "@/lib/ai-attachments";
import { listPendingAiAttachments, removeAiAttachment, uploadAiAttachment } from "@/actions/ai-attachments";

export function AiFileLinks({ files, onOpen }: { files: AiAttachment[]; onOpen?: (file: AiAttachment) => void }) {
  return <div className="space-y-1">{files.some(f => f.generated) && <p className="text-xs font-medium">Tệp kết quả</p>}<div className="flex min-w-0 flex-wrap gap-2">{files.map(file => <div key={file.id} className="flex min-w-0 max-w-full items-center rounded-lg border bg-background">
    {onOpen ? <Button variant="ghost" className="min-h-10 min-w-0 justify-start px-2" title={file.name} onClick={() => onOpen(file)}>{file.kind === "image" ? <FilePreview file={file} /> : <FileText className="size-4 shrink-0" />}<span className="truncate">{file.name}</span></Button> : <a href={`/media/ai-attachments/${file.id}`} className="min-h-10 truncate px-2 py-2 text-sm">{file.name}</a>}
    <Button asChild variant="ghost" size="icon" className="size-10 shrink-0"><a href={`/media/ai-attachments/${file.id}`} aria-label={`Tải xuống ${file.name}`}><Download className="size-4" /></a></Button>
  </div>)}</div></div>;
}
function FilePreview({ file }: { file: AiAttachment }) {
  // Authenticated, private endpoint; native image avoids the shared image optimizer cache.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/media/ai-attachments/${file.id}?preview=1`} alt={file.name} className="size-10 rounded object-contain" />;
}
export function AiDataTables({ tables }: { tables: AttachmentTable[] }) {
  return <div className="mt-3 space-y-3">{tables.map((table, i) => <details key={i} open={i === tables.length - 1} className="min-w-0 rounded-lg border bg-background p-2">
    <summary className="min-h-10 cursor-pointer text-sm font-medium">{table.source}</summary>
    <div className="max-h-80 overflow-auto" tabIndex={0} role="region" aria-label={`Bảng dữ liệu ${table.source}`}><table className="w-full text-left text-xs"><caption className="sr-only">{table.source}</caption><thead className="sticky top-0 bg-muted"><tr>{table.columns.map((col, j) => <th key={j} className="border-b px-2 py-2 whitespace-nowrap">{col}</th>)}</tr></thead><tbody>{table.rows.map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k} className="max-w-80 border-b px-2 py-2 break-words">{cell === null ? "—" : String(cell)}</td>)}</tr>)}</tbody></table></div>
    <p className="mt-2 text-xs text-muted-foreground">{table.note}</p>
  </details>)}</div>;
}
export type AttachmentPickerHandle = { addFiles: (files: File[]) => void };
export function AiAttachmentPicker({ ref, files, onChange, disabled, onBusy, toolbar }: { toolbar?: ReactNode; ref?: Ref<AttachmentPickerHandle>; files: AiAttachment[]; onChange: (files: AiAttachment[]) => void; disabled: boolean; onBusy: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null), busyRef = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [pending, setPending] = useState<AiAttachment[]>([]);
  const retryUpload = useRef<{ file: File; uploadId: string } | null>(null);
  useEffect(() => { let mounted = true; listPendingAiAttachments().then(r => { if (mounted && r.success) setPending(r.files); }).catch(() => {}); return () => { mounted = false; }; }, []);
  async function addFiles(incoming: File[]) {
    if (disabled || busyRef.current || !incoming.length) return;
    if (incoming.length + files.length > AI_LIMITS.files.perMessage) { setError(`Tối đa ${AI_LIMITS.files.perMessage} tệp trong một lượt gửi.`); return; }
    if (incoming.some(f => f.size > AI_LIMITS.files.maxBytes)) { setError(`Mỗi tệp tối đa ${AI_LIMITS.files.maxBytes / 1024 / 1024} MiB.`); return; }
    busyRef.current = true; setBusy(true); onBusy(true); setError("");
    const selected = [...files];
    try {
      for (const file of incoming) {
        const uploadId = retryUpload.current?.file === file ? retryUpload.current.uploadId : crypto.randomUUID();
        retryUpload.current = { file, uploadId };
        const body = new FormData(); body.set("file", file); body.set("uploadId", uploadId);
        const result = await uploadAiAttachment(body);
        if (!result.success) { retryUpload.current = null; setError(result.message); break; }
        retryUpload.current = null;
        if (!selected.some(f => f.id === result.file.id) && result.file.messageId === null) selected.push(result.file);
        onChange([...selected]);
      }
    } catch { setError("Mất kết nối khi tải tệp. Bấm Thử tải lại; không cần chọn tệp lại."); }
    finally { busyRef.current = false; setBusy(false); onBusy(false); }
  }
  useImperativeHandle(ref, () => ({ addFiles: incoming => { void addFiles(incoming); } }));
  async function remove(file: AiAttachment) {
    if (busyRef.current || disabled) return;
    busyRef.current = true; setBusy(true); onBusy(true); setError("");
    try { const result = await removeAiAttachment({ id: file.id }); if (!result.success) setError(result.message); else { onChange(files.filter(f => f.id !== file.id)); setPending(old => old.filter(f => f.id !== file.id)); } }
    catch { setError("Chưa bỏ được tệp. Hãy thử lại."); }
    finally { busyRef.current = false; setBusy(false); onBusy(false); }
  }
  const available = pending.filter(p => !files.some(f => f.id === p.id));
  return <div className="min-w-0 space-y-2" aria-label="Tệp đính kèm">
    <div className="flex min-w-0 items-center gap-1"><Button type="button" variant="ghost" className="min-h-10 shrink-0 px-2" aria-label="Đính kèm tệp" disabled={disabled || busy || files.length >= AI_LIMITS.files.perMessage} onClick={() => input.current?.click()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}<span className="hidden sm:inline">Đính kèm</span></Button>
      <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 text-muted-foreground" aria-label="Định dạng và giới hạn tệp"><Info aria-hidden="true" className="size-4" /></Button></PopoverTrigger><PopoverContent className="w-64 text-sm">Ảnh, Word, Excel, CSV, PDF. Tối đa {AI_LIMITS.files.maxBytes / 1024 / 1024} MiB/tệp, {AI_LIMITS.files.perMessage} tệp mỗi lượt gửi.</PopoverContent></Popover>
      {toolbar}
    </div>
    <Input ref={input} type="file" accept={AI_FILE_ACCEPT} multiple className="sr-only h-px w-px p-0" tabIndex={-1} aria-label="Chọn tệp đính kèm" disabled={disabled || busy} onChange={e => { const selected = Array.from(e.target.files ?? []); e.target.value = ""; void addFiles(selected); }} />
    {busy && <p role="status" className="text-xs text-muted-foreground">Đang xử lý tệp…</p>}
    {files.length > 0 && <div className="flex flex-wrap gap-2">{files.map(file => <div key={file.id} className="flex min-w-0 max-w-full items-center gap-1 rounded-lg border bg-muted/30 pl-2"><span className="max-w-64 truncate text-sm" title={file.name}>{file.name}</span><Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label={`Bỏ tệp ${file.name}`} disabled={disabled || busy} onClick={() => remove(file)}><X className="size-4" /></Button></div>)}</div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}<Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => { const retry = retryUpload.current; if (retry) void addFiles([retry.file]); else setError(""); }}>{error.startsWith("Mất kết nối") ? "Thử tải lại" : "Đóng"}</Button></p>}
    {available.length > 0 && <details><summary className="min-h-10 cursor-pointer text-xs text-muted-foreground">Tệp chưa gửi ({available.length})</summary>{available.map(file => <div key={file.id} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{file.name}</span><Button type="button" variant="ghost" disabled={disabled || busy || files.length >= AI_LIMITS.files.perMessage} onClick={() => { onChange([...files, file]); setPending(old => old.filter(f => f.id !== file.id)); }}>Đính kèm</Button><Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => remove(file)}>Bỏ</Button></div>)}</details>}
  </div>;
}
