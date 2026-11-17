"use client";

import { useState, useTransition } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { saveAiConnectionPolicy, saveAiJob, saveAiAccountLimit } from "@/actions/ai-governance";
import { testAiKey } from "@/actions/ai-settings";
import { SaveAiPolicySchema, SaveAiJobSchema, SaveAiLimitSchema, AI_JOB_LABELS, type AiPolicyInput, type AiJobInput, type AiLimitInput, type AiPrices } from "@/lib/validations/ai-governance";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { getAiGovernance } from "@/actions/ai-governance";

export type GovernanceData = Extract<Awaited<ReturnType<typeof getAiGovernance>>, { success: true }>;
const emptyPrices = (model: string): AiPrices => ({ version: 1, model, input: "", cached: "", output: "" });
function Prices() {
  const form = useFormContext<{ prices: AiPrices | null }>();
  return <fieldset className="space-y-3 rounded-xl border p-4"><legend className="px-1 text-sm font-medium">Đơn giá USD / 1 triệu token</legend>
    <p className="text-sm text-muted-foreground">Nhập đơn giá theo hợp đồng hoặc bảng giá OpenAI. Dùng để ước tính ngân sách ERP.</p>
    <div className="grid gap-3 sm:grid-cols-3">{([ ["input", "Đầu vào"], ["cached", "Đầu vào cache"], ["output", "Đầu ra"] ] as const).map(([key, label]) => <FormField key={key} control={form.control} name={`prices.${key}`} render={({ field }) => <FormItem><FormLabel required>{label}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" aria-required="true" className="text-base" /></FormControl><FormMessage /></FormItem>} />)}</div>
    <a className="text-sm text-primary underline" href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noreferrer">Xem bảng giá OpenAI</a>
  </fieldset>;
}
function Notice({ error }: { error: string }) { return error ? <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm">{error}</p> : null; }

export function AiPolicyForm({ row, done }: { row: GovernanceData["connections"][number]; done: () => void }) {
  const form = useForm<AiPolicyInput>({ resolver: zodResolver(SaveAiPolicySchema), defaultValues: { id: row.id, version: row.version, limit: row.limit, prices: row.prices?.model === row.model ? row.prices : null } });
  const [pending, start] = useTransition(), [error, setError] = useState("");
  const configuredPrices = useWatch({ control: form.control, name: "prices" });
  return <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(values => start(async () => {
    setError(""); try { const result = await saveAiConnectionPolicy(values); if (!result.success) { setError(result.message); return; } toast.success(result.message); done(); } catch { setError("Chưa xác nhận lưu. Tải lại trước khi thử tiếp."); }
  }))}>
    <p className="break-all text-sm">Model: <strong>{row.model}</strong></p>
    <FormRequiredHint />
    <FormField control={form.control} name="limit" render={({ field }) => <FormItem><FormLabel>Ngân sách kết nối (USD/tháng)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} onChange={event => field.onChange(event.target.value || null)} inputMode="decimal" placeholder="Không giới hạn" className="text-base" /></FormControl><FormMessage /><p className="text-sm text-muted-foreground">Để trống: không giới hạn. 0: chặn gọi có phí. Chỉ tính lưu lượng qua ERP, không phải trần project hoặc số dư OpenAI.</p></FormItem>} />
    <label className="flex min-h-10 items-center gap-2 text-sm"><Checkbox checked={configuredPrices !== null} onCheckedChange={checked => form.setValue("prices", checked ? emptyPrices(row.model) : null, { shouldDirty: true })} />Cấu hình đơn giá ước tính</label>
    {configuredPrices && <Prices />}<Notice error={error} /><Button type="submit" disabled={pending} className="min-h-10">{pending ? "Đang lưu…" : "Lưu ngân sách kết nối"}</Button>
  </form></Form>;
}

export function AiJobForm({ initial, connections, done }: { initial: AiJobInput; connections: GovernanceData["connections"]; done: () => void }) {
  const form = useForm<AiJobInput>({ resolver: zodResolver(SaveAiJobSchema), defaultValues: initial });
  const [pending, start] = useTransition(), [error, setError] = useState(""), [models, setModels] = useState<string[]>([]), [manual, setManual] = useState(false);
  const connectionId = useWatch({ control: form.control, name: "connectionId" }), model = useWatch({ control: form.control, name: "model" });
  const configuredPrices = useWatch({ control: form.control, name: "prices" });
  const connection = connectionId ? connections.find(row => row.id === connectionId) : connections.find(row => row.isDefault);
  function setModel(value: string | null) {
    form.setValue("model", value, { shouldDirty: true });
    form.setValue("prices", null, { shouldDirty: true });
  }
  return <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(values => start(async () => {
    setError(""); try { const result = await saveAiJob(values); if (!result.success) { setError(result.message); return; } toast.success(result.message); done(); } catch { setError("Chưa xác nhận lưu. Tải lại trước khi thử tiếp."); }
  }))}>
    <p className="text-sm text-muted-foreground">{AI_JOB_LABELS[initial.job]}. Người dùng chọn tác vụ trước khi gửi chat; kết nối được giữ trong cả lượt.</p>
    <FormField control={form.control} name="connectionId" render={({ field }) => <FormItem><FormLabel>Kết nối</FormLabel><FormControl><SearchableSelect ref={field.ref} onBlur={field.onBlur} label="Kết nối tác vụ" value={field.value?.toString() ?? "default"} disabled={pending} onValueChange={value => { field.onChange(value === "default" ? null : Number(value)); setModels([]); }} options={[{ value: "default", label: "Kế thừa kết nối mặc định" }, ...connections.map(row => ({ value: String(row.id), label: row.name, description: row.enabled ? row.model : "Đang tạm dừng", disabled: !row.enabled }))]} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="model" render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><SearchableSelect ref={field.ref} onBlur={field.onBlur} label="Model tác vụ" value={field.value ?? "default"} disabled={pending} onValueChange={value => setModel(value === "default" ? null : value)} options={[{ value: "default", label: `Kế thừa model kết nối${connection ? `: ${connection.model}` : ""}` }, ...[...new Set([...(model ? [model] : []), ...models])].map(value => ({ value, label: value }))]} /></FormControl><FormMessage /></FormItem>} />
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={pending || !connection} onClick={() => start(async () => {
      if (!connection) return; setError(""); try { const result = await testAiKey({ target: connection.id, version: connection.version, apiKey: "" }); if (result.success) setModels(result.models); else setError(result.message); } catch { setError("Chưa tải được model. Thử lại hoặc nhập tên model."); }
    })}>Tải model của kết nối</Button><Button type="button" variant="ghost" disabled={pending} onClick={() => setManual(!manual)}>Nhập tên model</Button></div>
    {manual && <Input aria-label="Tên model tác vụ" value={model ?? ""} onChange={event => setModel(event.target.value || null)} placeholder="Để trống để kế thừa" disabled={pending} className="text-base" />}
    {model && <label className="flex min-h-10 items-center gap-2 text-sm"><Checkbox checked={configuredPrices !== null} onCheckedChange={checked => form.setValue("prices", checked ? emptyPrices(model) : null, { shouldDirty: true })} />Cấu hình đơn giá model riêng</label>}
    {model && configuredPrices && <><FormRequiredHint /><Prices /></>}
    <Notice error={error} /><Button type="submit" disabled={pending} className="min-h-10">{pending ? "Đang lưu…" : "Lưu cấu hình tác vụ"}</Button>
  </form></Form>;
}

export function AiLimitForm({ row, done }: { row: GovernanceData["accounts"][number]; done: () => void }) {
  const form = useForm<AiLimitInput>({ resolver: zodResolver(SaveAiLimitSchema), defaultValues: { accountId: row.id, version: row.version, limit: row.limit } });
  const [pending, start] = useTransition(), [error, setError] = useState("");
  return <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(values => start(async () => {
    setError(""); try { const result = await saveAiAccountLimit(values); if (!result.success) { setError(result.message); return; } toast.success(result.message); done(); } catch { setError("Chưa xác nhận lưu. Tải lại trước khi thử tiếp."); }
  }))}>
    <p>{row.name} · {row.username}</p><FormRequiredHint />
    <FormField control={form.control} name="limit" render={({ field }) => <FormItem><FormLabel>Hạn mức tài khoản (USD/tháng)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} onChange={event => field.onChange(event.target.value || null)} inputMode="decimal" placeholder="Không giới hạn" className="text-base" /></FormControl><FormMessage /></FormItem>} />
    <p className="text-sm text-muted-foreground">Tháng lịch theo giờ Việt Nam. Để trống: không giới hạn. 0: chặn gọi có phí. Đổi key hoặc hạn mức không xóa mức đã dùng.</p>
    <Notice error={error} /><Button type="submit" disabled={pending} className="min-h-10">{pending ? "Đang lưu…" : "Lưu hạn mức"}</Button>
  </form></Form>;
}
