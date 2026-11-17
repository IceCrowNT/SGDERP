"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { KeyRound, Loader2, Plus, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { getAiConnections, getAiSettings, setDefaultAiConnection } from "@/actions/ai-settings";
import { emptyAiSettings, type AiConnectionsView, type AiSettingsView } from "@/lib/validations/ai-settings";
import { AiSettings } from "@/components/ai/AiSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const subscribe = () => () => {};
export function AiConnections({ initial, onPolicy }: { initial: AiConnectionsView; onPolicy?: (id: number) => void }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [list, setList] = useState(initial), [editing, setEditing] = useState<AiSettingsView | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [dirty, setDirty] = useState(false), [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState(""), [pending, start] = useTransition();
  const busy = !ready || pending;
  function reload() {
    start(async () => {
      setError("");
      try { const result = await getAiConnections(); if (result.success) setList(result); else setError(result.message); }
      catch { setError("Không tải được danh sách kết nối. Hãy thử lại."); }
    });
  }
  function edit(row: AiSettingsView) {
    start(async () => {
      setError("");
      try {
        const result = await getAiSettings(row.target);
        if (!result.success) { setError(result.message); return; }
        setDirty(false); setEditing(result.settings);
      } catch { setError("Không tải được kết nối. Hãy thử lại."); }
    });
  }
  function makeDefault(row: AiSettingsView) {
    if (typeof row.target !== "number" || !row.version) return;
    const input = { id: row.target, version: row.version, expectedDefault: list.defaultStamp };
    start(async () => {
      setError("");
      try {
        const result = await setDefaultAiConnection(input);
        if (!result.success) { setError(result.message); return; }
        setList(result); toast.success(result.message);
      } catch { setError("Chưa xác nhận đổi mặc định. Hãy tải lại danh sách trước khi thử tiếp."); }
    });
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">Thêm key riêng và chọn kết nối mặc định cho trợ lý.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={reload} className="min-h-10"><RefreshCw className="size-4" />Tải lại danh sách</Button><Button disabled={busy} onClick={() => { setDirty(false); setEditing({ ...emptyAiSettings }); }} className="min-h-10"><Plus className="size-4" />Thêm kết nối</Button></div>
    </div>
    {pending && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />Đang cập nhật kết nối…</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>}
    {!list.connections.length && <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Chưa có kết nối OpenAI. Chọn Thêm kết nối để thiết lập API key và model.</div>}
    <div className="space-y-3" aria-label="Danh sách kết nối AI">
      {list.connections.map(row => <article key={row.target} aria-label={row.name} className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="flex items-center gap-2 font-semibold"><KeyRound aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className="break-all">{row.name}</span></h3>
            <p className="mt-2 break-all text-sm text-muted-foreground">OpenAI · <span className="font-mono">{row.maskedKey}</span> · {row.model || "Chưa chọn model"}</p></div>
          <div className="flex flex-wrap gap-2">{row.isDefault && <Badge><Star className="mr-1 size-3" />Mặc định</Badge>}<Badge variant="secondary">{row.enabled ? "Đang bật" : "Tạm dừng"}</Badge></div>
        </div>
        {row.source === "environment" && <p className="mt-3 text-sm text-muted-foreground">Đang dùng key từ cấu hình máy chủ. Lưu kết nối hiện tại để quản lý trong phần mềm; khi thêm key khác, kết nối này cũng được giữ lại.</p>}
        {!row.enabled && <p className="mt-3 text-sm text-muted-foreground">{row.isDefault ? "Trợ lý đang tạm dừng. Bật lại hoặc chọn kết nối mặc định khác." : "Bật lại trong phần chỉnh sửa trước khi chọn làm mặc định."}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {onPolicy && typeof row.target === "number" && <Button variant="outline" disabled={busy} onClick={() => onPolicy(row.target as number)} className="min-h-10">Ngân sách & đơn giá</Button>}
          <Button variant="outline" disabled={busy} onClick={() => edit(row)} className="min-h-10">{row.source === "environment" ? "Lưu kết nối hiện tại" : "Chỉnh sửa / thay key"}</Button>
          {!row.isDefault && <Button variant="secondary" disabled={busy || !row.enabled} onClick={() => makeDefault(row)} className="min-h-10">Đặt làm mặc định</Button>}
        </div>
      </article>)}
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !formBusy) { if (dirty) setConfirmClose(true); else setEditing(null); } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl" showCloseButton={false} onInteractOutside={event => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editing?.target === "new" ? "Thêm kết nối OpenAI" : "Cài đặt kết nối OpenAI"}</DialogTitle><DialogDescription>{editing?.target === "new" ? "Key mới được lưu riêng. Kết nối hiện tại được giữ nguyên." : "Chỉnh sửa tên, model hoặc thay key của kết nối này."}</DialogDescription></DialogHeader>
        {editing && <AiSettings key={editing.target} initialSettings={editing} onDirtyChange={setDirty} onBusyChange={setFormBusy} onSaved={saved => { setEditing(saved); setDirty(false); reload(); }} />}
        <Button variant="outline" disabled={formBusy} className="min-h-10" onClick={() => { if (dirty) setConfirmClose(true); else setEditing(null); }}>Đóng</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
      <DialogContent showCloseButton={false}><DialogHeader><DialogTitle>Đóng phần chỉnh sửa?</DialogTitle><DialogDescription>Thay đổi chưa lưu sẽ bị bỏ.</DialogDescription></DialogHeader><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setConfirmClose(false)} className="min-h-10">Tiếp tục chỉnh sửa</Button><Button onClick={() => { setConfirmClose(false); setEditing(null); setDirty(false); }} className="min-h-10">Bỏ thay đổi và đóng</Button></div></DialogContent>
    </Dialog>
  </div>;
}
