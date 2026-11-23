'use client';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Loader2, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openOfficeEditor, saveOfficeEditor, officeEditorStatus } from '@/actions/office-editor';
import type { AiAttachment } from '@/lib/ai-attachments';
type Editor = { destroyEditor(): void };
type EditorConfig = Record<string, unknown>;
declare global { interface Window { DocsAPI?: { DocEditor: new (id: string, config: EditorConfig) => Editor } } }
let scriptPromise: Promise<void> | null = null;
function loadScript(url: string) {
  if (window.DocsAPI) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = url; script.async = true; script.referrerPolicy = 'no-referrer';
    const timer = setTimeout(() => { script.remove(); scriptPromise = null; reject(Error()); }, 20000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); scriptPromise = null; reject(Error()); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export function AiOfficePanel({ file, chatId, onLocked, onSaved }: { file: AiAttachment; chatId: number; onLocked: (value: boolean) => void; onSaved: (file: AiAttachment) => void }) {
  const mountId = useId().replace(/:/g, ''), editor = useRef<Editor | null>(null), revision = useRef(0), mounted = useRef(true), inFlight = useRef(false), retrySave = useRef<{ revision: number; requestId: string } | null>(null);
  const [loading, setLoading] = useState(file.kind !== 'image'), [error, setError] = useState(''), [token, setToken] = useState(''), [editable, setEditable] = useState(false), [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [savedFile, setSavedFile] = useState<AiAttachment | null>(null), [retry, setRetry] = useState(0), [viewReason, setViewReason] = useState('');
  const notifyLocked = useEffectEvent(onLocked);
  useEffect(() => { notifyLocked(dirty || saving); }, [dirty, saving]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const prevent = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const preventNavigation = (e: MouseEvent) => { const link = e.target instanceof Element ? e.target.closest('a[href]') : null; if (link && !link.getAttribute('href')?.startsWith('/media/ai-attachments/')) { e.preventDefault(); e.stopPropagation(); setError('Lưu bản mới trước khi rời cuộc chat.'); } };
    window.addEventListener('beforeunload', prevent); document.addEventListener('click', preventNavigation, true); return () => { window.removeEventListener('beforeunload', prevent); document.removeEventListener('click', preventNavigation, true); };
  }, [dirty, saving]);
  useEffect(() => {
    mounted.current = true; let active = true; let readyTimer: ReturnType<typeof setTimeout>;
    if (file.kind !== 'image') void (async () => {
      try {
        const result = await openOfficeEditor({ fileId: file.id, chatId, mobile: window.matchMedia('(max-width: 767px)').matches });
        if (!active) return;
        if (!result.success) { setError(result.message); setLoading(false); return; }
        await loadScript(result.scriptUrl); if (!active || !window.DocsAPI) return;
        setToken(result.token); setEditable(result.editable); setViewReason(result.viewReason);
        readyTimer = setTimeout(() => { if (active) { setLoading(false); setError('Tài liệu chưa mở được. Kiểm tra kết nối dịch vụ rồi thử lại.'); } }, 45000);
        editor.current = new window.DocsAPI.DocEditor(mountId, { ...result.config, events: {
          onDocumentReady: () => { if (active) { clearTimeout(readyTimer); setLoading(false); } },
          onDocumentStateChange: (event: { data: boolean }) => { if (active && event.data) { revision.current++; setDirty(true); } },
          onError: () => { if (active) { clearTimeout(readyTimer); setLoading(false); setError('Editor gặp lỗi kết nối hoặc xử lý tệp. Giữ trang đang mở nếu có thay đổi chưa lưu.'); } },
        } });
      } catch { if (active) { setLoading(false); setError('Không kết nối được trình soạn thảo. Kiểm tra dịch vụ Office và thử lại.'); } }
    })();
    return () => { active = false; mounted.current = false; clearTimeout(readyTimer); editor.current?.destroyEditor(); editor.current = null; };
  }, [file.id, file.kind, chatId, mountId, retry]);
  async function save() {
    if (inFlight.current || !token) return;
    inFlight.current = true; setSaving(true); setError('');
    const rev = revision.current, requestId = retrySave.current?.revision === rev ? retrySave.current.requestId : crypto.randomUUID();
    retrySave.current = { revision: rev, requestId };
    try {
      const previous = await officeEditorStatus({ token, requestId });
      if (previous.success && previous.file) { setSavedFile(previous.file); onSaved(previous.file); if (revision.current === rev) setDirty(false); return; }
      const result = await saveOfficeEditor({ token, requestId });
      if (!result.success) { setError(result.message); return; }
      const deadline = Date.now() + 90000;
      while (mounted.current && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1500)); if (!mounted.current) return;
        const status = await officeEditorStatus({ token, requestId });
        if (!status.success) { setError(status.message); return; }
        if (status.file) { setSavedFile(status.file); onSaved(status.file); if (revision.current === rev) setDirty(false); return; }
      }
      if (mounted.current) setError('ERP chưa xác nhận lưu. Giữ tài liệu đang mở và thử Lưu lại; bạn cũng có thể tải bản đang sửa từ menu Tệp của editor.');
    } catch { if (mounted.current) setError('Mất kết nối khi lưu. Nội dung vẫn ở editor; hãy thử lại.'); }
    finally { inFlight.current = false; if (mounted.current) setSaving(false); }
  }
  return <div className="flex min-h-0 flex-1 flex-col" aria-label="Trình soạn thảo tài liệu">
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2">
      <p className="min-w-0 flex-1 truncate text-sm font-medium" title={file.name}>{file.name}</p>
      <Button asChild variant="ghost" size="icon" className="size-10"><a href={`/media/ai-attachments/${savedFile?.id ?? file.id}`} aria-label="Tải bản đã lưu"><Download className="size-4" /></a></Button>
      {editable && <Button className="min-h-10" onClick={save} disabled={loading || saving || !dirty}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Lưu bản mới</Button>}
    </div>
    {(dirty || saving || savedFile) && <p role="status" className="shrink-0 px-3 py-2 text-xs text-muted-foreground">{saving ? 'Đang chờ ERP xác nhận bản lưu…' : dirty ? 'Có thay đổi chưa lưu vào chat. Lưu bản mới trước khi đóng hoặc đổi tài liệu.' : 'Đã lưu bản mới vào cuộc chat.'}</p>}
    {viewReason && <p className="shrink-0 px-3 py-2 text-xs text-muted-foreground">{viewReason}</p>}
    {error && <div role="alert" className="shrink-0 space-y-2 p-3 text-sm"><p>{error}</p>{!dirty && !saving && <Button variant="outline" onClick={() => { setError(''); setLoading(true); setRetry(n => n + 1); }}>Thử kết nối lại</Button>}</div>}
    {loading && <p role="status" className="flex shrink-0 items-center gap-2 p-3 text-sm"><Loader2 className="size-4 animate-spin" />Đang mở tài liệu…</p>}
    {file.kind === 'image' ? <div className="min-h-0 flex-1 overflow-auto p-3">
      {/* Private image bypasses shared optimizer cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/media/ai-attachments/${file.id}?preview=1`} alt={file.name} className="mx-auto max-w-full" /></div> : <div className="min-h-0 flex-1"><div id={mountId} className="h-full min-h-80" /></div>}
  </div>;
}
