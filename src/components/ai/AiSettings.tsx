"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { getAiSettings, saveAiSettings, testAiKey } from "@/actions/ai-settings";
import { SaveAiSettingsSchema, type AiSettingsInput, type AiSettingsView } from "@/lib/validations/ai-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AiSettings({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" disabled={disabled} className="min-h-10"><Settings2 className="size-4" />Cài đặt AI</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg" showCloseButton={!busy}
      onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Kết nối OpenAI</DialogTitle><DialogDescription>Quản lý API key và model dùng cho trợ lý trong phần mềm.</DialogDescription></DialogHeader>
      {open && <SettingsLoader onBusy={setBusy} onClose={() => { setBusy(false); setOpen(false); }} />}
    </DialogContent>
  </Dialog>;
}

function SettingsLoader({ onBusy, onClose }: { onBusy: (busy: boolean) => void; onClose: () => void }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof getAiSettings>> | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getAiSettings().then(r => { if (!cancelled) setResult(r); }).catch(() => { if (!cancelled) setResult({ success: false, message: "Không tải được cài đặt. Hãy thử lại." }); });
    return () => { cancelled = true; };
  }, [attempt]);
  if (!result) return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tải cài đặt…</p>;
  if (!result.success) return <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{result.message}</p><Button variant="outline" onClick={() => { setResult(null); setAttempt(a => a + 1); }}>Thử lại</Button></div>;
  return <SettingsForm settings={result.settings} onBusy={onBusy} onClose={onClose} />;
}

function SettingsForm({ settings, onBusy, onClose }: { settings: AiSettingsView; onBusy: (busy: boolean) => void; onClose: () => void }) {
  const form = useForm<AiSettingsInput>({ resolver: zodResolver(SaveAiSettingsSchema), defaultValues: { version: settings.version, apiKey: "", model: settings.model, enabled: settings.enabled } });
  const [pending, start] = useTransition(), [showKey, setShowKey] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [models, setModels] = useState<string[]>([]), [manualModel, setManualModel] = useState(true);
  useEffect(() => { onBusy(pending); }, [pending, onBusy]);
  const submit = form.handleSubmit(values => start(async () => {
    setError("");
    try {
      const result = await saveAiSettings(values);
      if (!result.success) {
        setError(result.message);
        if ("fieldErrors" in result && result.fieldErrors) for (const [field, messages] of Object.entries(result.fieldErrors))
          if (messages?.[0]) form.setError(field as keyof AiSettingsInput, { message: messages[0] }, { shouldFocus: true });
        return;
      }
      form.reset({ ...values, apiKey: "" }); setShowKey(false); toast.success(result.message); onClose();
    } catch { setError("Không kết nối được máy chủ. Cài đặt chưa được xác nhận đã lưu; hãy mở lại trước khi thử tiếp."); }
  }));
  async function testKey() {
    if (!await form.trigger("apiKey")) return;
    setError(""); setNotice("");
    start(async () => {
      try {
        const result = await testAiKey({ version: settings.version, apiKey: form.getValues("apiKey") });
        if (!result.success) { setModels([]); setManualModel(true); setError(result.message); return; }
        setModels(result.models); setManualModel(result.models.length === 0); setNotice(result.message);
      } catch { setError("Không kiểm tra được kết nối. Hãy thử lại."); }
    });
  }
  return <Form {...form}><form noValidate aria-label="Cài đặt kết nối AI" onSubmit={submit} className="space-y-5">
    <FormRequiredHint />
    {settings.hasKey && <p className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm"><KeyRound className="size-4 text-muted-foreground" /><span>Khóa hiện tại: <strong className="font-mono">{settings.maskedKey}</strong></span>{settings.source === "environment" && <span className="text-muted-foreground">· Cấu hình máy chủ</span>}</p>}
    <FormField control={form.control} name="apiKey" render={({ field }) => <FormItem><FormLabel required={!settings.hasKey}>{settings.hasKey ? "API key mới" : "API key"}</FormLabel><div className="flex gap-2"><FormControl><Input {...field} disabled={pending} type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false} aria-required={!settings.hasKey} placeholder={settings.hasKey ? "Để trống để giữ khóa hiện tại" : "Dán API key của bạn"} className="min-w-0 text-base" onChange={event => { field.onChange(event); setModels([]); setManualModel(true); setNotice(""); }} /></FormControl><Button type="button" variant="outline" className="size-10 shrink-0" disabled={pending} aria-label={showKey ? "Ẩn khóa đang nhập" : "Hiện khóa đang nhập"} onClick={() => setShowKey(v => !v)}>{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div><FormMessage /><p className="text-xs text-muted-foreground">Khóa được mã hóa khi lưu. Phần mềm không hiển thị lại khóa đã lưu.</p></FormItem>} />
    <Button type="button" variant="outline" disabled={pending} className="min-h-10 w-full whitespace-normal" onClick={testKey}>{pending && <Loader2 className="size-4 animate-spin" />}Kiểm tra khóa và tải model</Button>
    <FormField control={form.control} name="model" render={({ field }) => <FormItem><FormLabel required>Model</FormLabel><FormControl>{manualModel ? <Input {...field} aria-required="true" disabled={pending} autoComplete="off" placeholder="Nhập tên model được cấp quyền" className="text-base" /> : <SearchableSelect label="Model" ref={field.ref} onBlur={field.onBlur} aria-required="true" disabled={pending} value={field.value} onValueChange={field.onChange} placeholder="Chọn model" options={[...(!models.includes(field.value) && field.value ? [{ value: field.value, label: field.value, description: "Model đang nhập; chưa có trong danh sách" }] : []), ...models.map(model => ({ value: model, label: model }))]} />}</FormControl><FormMessage />{models.length > 0 && <Button type="button" variant="ghost" size="sm" disabled={pending} className="min-h-10 px-0" onClick={() => setManualModel(v => !v)}>{manualModel ? "Chọn từ danh sách" : "Nhập tên model thủ công"}</Button>}<p className="text-xs text-muted-foreground">Chọn model hỗ trợ hội thoại và gọi công cụ. Kiểm tra danh sách chưa xác nhận khả năng trả lời hoặc hạn mức thanh toán.</p></FormItem>} />
    <FormField control={form.control} name="enabled" render={({ field }) => <FormItem className="flex items-center gap-3 rounded-lg border p-3"><FormControl><Checkbox ref={field.ref} onBlur={field.onBlur} disabled={pending} checked={field.value} onCheckedChange={value => field.onChange(value === true)} /></FormControl><div><FormLabel>Cho phép sử dụng kết nối</FormLabel><p className="mt-1 text-xs text-muted-foreground">Bỏ chọn để tạm dừng AI trong phần mềm.</p></div></FormItem>} />
    {notice && <p role="status" className="rounded-lg bg-muted/60 p-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" className="min-h-10" disabled={pending} onClick={onClose}>Hủy</Button><Button type="submit" className="min-h-10" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Lưu cài đặt</Button></div>
  </form></Form>;
}
