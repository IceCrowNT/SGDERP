"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAiSettings, saveAiSettings, testAiKey } from "@/actions/ai-settings";
import { SaveAiSettingsSchema, type AiSettingsInput, type AiSettingsView } from "@/lib/validations/ai-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormRequiredHint } from "@/components/ui/form";

const subscribe = () => () => {};
export function AiSettings({ initialSettings }: { initialSettings: AiSettingsView }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [settings, setSettings] = useState(initialSettings);
  const form = useForm<AiSettingsInput>({ resolver: zodResolver(SaveAiSettingsSchema), defaultValues: { version: settings.version, apiKey: "", model: settings.model, enabled: settings.enabled } });
  const [pending, start] = useTransition(), [showKey, setShowKey] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [models, setModels] = useState<string[]>([]), [manualModel, setManualModel] = useState(false);
  const [loadingModels, startLoadingModels] = useTransition();
  const autoLoaded = useRef(false);
  const busy = !ready || pending || loadingModels;
  const loadModels = useCallback((input?: { version: string | null; apiKey: string }) => {
    autoLoaded.current = true;
    const request = input ?? { version: form.getValues("version"), apiKey: form.getValues("apiKey") };
    const stillCurrent = () => form.getValues("version") === request.version && form.getValues("apiKey") === request.apiKey;
    startLoadingModels(async () => {
      setError(""); setNotice("");
      try {
        const result = await testAiKey(request);
        if (!stillCurrent()) return;
        if (!result.success) { setModels([]); setError(result.message); return; }
        setModels(result.models); setManualModel(false);
        setNotice(result.models.length ? `Đã tải ${result.models.length} model từ OpenAI. Chọn model rồi lưu cài đặt.` : "Khóa này chưa trả về model nào. Bạn có thể thử tải lại hoặc nhập tên model được cấp quyền.");
      } catch { if (stillCurrent()) { setModels([]); setError("Không tải được danh sách model. Hãy thử lại hoặc nhập tên model thủ công."); } }
    });
  }, [form]);
  useEffect(() => {
    if (!initialSettings.hasKey || autoLoaded.current) return;
    autoLoaded.current = true;
    loadModels({ version: initialSettings.version, apiKey: "" });
  }, [initialSettings.hasKey, initialSettings.version, loadModels]);
  function reset(settings: AiSettingsView, keepModels = false) {
    setSettings(settings);
    form.reset({ version: settings.version, apiKey: "", model: settings.model, enabled: settings.enabled });
    setShowKey(false); setManualModel(false); setError(""); setNotice("");
    if (!keepModels) {
      setModels([]);
      if (settings.hasKey) loadModels({ version: settings.version, apiKey: "" });
    }
  }
  function reload() {
    start(async () => {
      try {
        const result = await getAiSettings();
        if (result.success) reset(result.settings); else setError(result.message);
      } catch { setError("Không tải được cài đặt. Hãy thử lại."); }
    });
  }
  const submit = (event: FormEvent<HTMLFormElement>) => form.handleSubmit(values => start(async () => {
    setError("");
    try {
      const result = await saveAiSettings(values);
      if (!result.success) {
        setError(result.message);
        if ("fieldErrors" in result && result.fieldErrors) for (const [field, messages] of Object.entries(result.fieldErrors))
          if (messages?.[0]) form.setError(field as keyof AiSettingsInput, { message: messages[0] }, { shouldFocus: true });
        return;
      }
      reset(result.settings, models.length > 0); toast.success(result.message);
    } catch { setError("Không kết nối được máy chủ. Cài đặt chưa được xác nhận đã lưu; hãy tải lại cài đặt trước khi thử tiếp."); }
  }))(event);
  async function testKey() {
    if (!await form.trigger("apiKey")) return;
    loadModels();
  }
  return <Form {...form}><form noValidate aria-label="Cài đặt kết nối AI" onSubmit={submit} className="space-y-5">
    <FormRequiredHint />
    {settings.hasKey && <p className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm"><KeyRound className="size-4 text-muted-foreground" /><span>Khóa hiện tại: <strong className="font-mono">{settings.maskedKey}</strong></span>{settings.source === "environment" && <span className="text-muted-foreground">· Cấu hình máy chủ</span>}</p>}
    <FormField control={form.control} name="apiKey" render={({ field }) => <FormItem><FormLabel required={!settings.hasKey}>{settings.hasKey ? "API key mới" : "API key"}</FormLabel><div className="flex gap-2"><FormControl><Input {...field} disabled={busy} type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false} aria-required={!settings.hasKey} placeholder={settings.hasKey ? "Để trống để giữ khóa hiện tại" : "Dán API key của bạn"} className="min-w-0 text-base" onChange={event => { field.onChange(event); setModels([]); setManualModel(false); setNotice(""); setError(""); }} /></FormControl><Button type="button" variant="outline" className="size-10 shrink-0" disabled={busy} aria-label={showKey ? "Ẩn khóa đang nhập" : "Hiện khóa đang nhập"} onClick={() => setShowKey(v => !v)}>{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div><FormMessage /><p className="text-xs text-muted-foreground">Khóa được mã hóa khi lưu. Phần mềm không hiển thị lại khóa đã lưu.</p></FormItem>} />
    <Button type="button" variant="outline" disabled={busy} className="min-h-10 w-full whitespace-normal" onClick={testKey}>{loadingModels && <Loader2 className="size-4 animate-spin" />}Kiểm tra khóa và tải model</Button>
    <FormField control={form.control} name="model" render={({ field }) => <FormItem><FormLabel required>Model</FormLabel><FormControl>{manualModel ? <Input {...field} aria-required="true" disabled={busy} autoComplete="off" placeholder="Nhập tên model được cấp quyền" className="text-base" /> : <SearchableSelect label="Model" ref={field.ref} onBlur={field.onBlur} aria-required="true" disabled={busy} value={field.value} onValueChange={field.onChange} placeholder={loadingModels ? "Đang tải model…" : "Chọn model từ OpenAI"} searchPlaceholder="Tìm tên model…" emptyMessage="Chưa có model phù hợp. Hãy kiểm tra khóa và tải lại danh sách." options={[...(!models.includes(field.value) && field.value ? [{ value: field.value, label: field.value, description: models.length ? "Model đang chọn; không có trong danh sách vừa tải" : "Model đang chọn" }] : []), ...models.map(model => ({ value: model, label: model }))]} />}</FormControl><FormMessage />{loadingModels && <p role="status" className="text-xs text-muted-foreground">Đang tải danh sách model từ OpenAI…</p>}<Button type="button" variant="ghost" size="sm" disabled={busy} className="min-h-10 px-0" onClick={() => setManualModel(v => !v)}>{manualModel ? "Chọn từ danh sách" : "Nhập tên model thủ công"}</Button><p className="text-xs text-muted-foreground">Chọn model hỗ trợ hội thoại và gọi công cụ. Kiểm tra danh sách chưa xác nhận khả năng trả lời hoặc hạn mức thanh toán.</p></FormItem>} />
    <FormField control={form.control} name="enabled" render={({ field }) => <FormItem className="flex items-center gap-3 rounded-lg border p-3"><FormControl><Checkbox ref={field.ref} onBlur={field.onBlur} disabled={busy} checked={field.value} onCheckedChange={value => field.onChange(value === true)} /></FormControl><div><FormLabel>Cho phép sử dụng kết nối</FormLabel><p className="mt-1 text-xs text-muted-foreground">Bỏ chọn để tạm dừng AI trong phần mềm.</p></div></FormItem>} />
    {notice && <p role="status" className="rounded-lg bg-muted/60 p-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button type="button" variant="ghost" className="mr-auto min-h-10" disabled={busy} onClick={reload}>Tải lại cài đặt</Button><Button type="button" variant="outline" className="min-h-10" disabled={busy || !form.formState.isDirty} onClick={() => reset(settings)}>Bỏ thay đổi</Button><Button type="submit" className="min-h-10" disabled={busy}>{pending && <Loader2 className="size-4 animate-spin" />}Lưu cài đặt</Button></div>
  </form></Form>;
}
