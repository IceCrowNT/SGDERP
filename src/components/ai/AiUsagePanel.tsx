"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getAiUsage, reconcileAiCall } from "@/actions/ai-governance";
import { aiMonth, AI_JOB_LABELS, ReconcileAiCallSchema, type AiUsageFilter, type AiJob } from "@/lib/validations/ai-governance";
import type { GovernanceData } from "./AiGovernanceForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Usage = Extract<Awaited<ReturnType<typeof getAiUsage>>, { success: true }>;
const statusLabels: Record<string, string> = { DANG_GOI: "Đang gọi / chờ đối chiếu", HOAN_TAT: "Đã có usage", LOI: "Lỗi · chưa rõ phí", CHUA_RO: "Chưa rõ phí", CHUA_GIA: "Chưa cấu hình giá", DOI_SOAT: "Đã đối chiếu" };
export function AiUsagePanel({ data }: { data: GovernanceData }) {
  const [filter, setFilter] = useState<AiUsageFilter>({ month: aiMonth(), page: 1 });
  const [result, setResult] = useState<Usage | null>(null), [error, setError] = useState("");
  const [pending, start] = useTransition(), [selected, setSelected] = useState<number | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const seq = ++sequence.current; let active = true;
    getAiUsage({ month: aiMonth(), page: 1 }).then(value => { if (!active || seq !== sequence.current) return; if (value.success) setResult(value); else setError(value.message); }).catch(() => { if (active && seq === sequence.current) setError("Chưa tải được mức sử dụng."); });
    return () => { active = false; };
  }, []);
  function load(next = { ...filter, page: 1 }) {
    const seq = ++sequence.current;
    start(async () => {
      setError(""); try { const value = await getAiUsage(next); if (seq !== sequence.current) return; if (value.success) { setResult(value); setFilter(next); } else setError(value.message); }
      catch { if (seq === sequence.current) setError("Chưa tải được mức sử dụng. Hãy thử lại."); }
    });
  }
  return <div className="space-y-4">
    <form onSubmit={event => { event.preventDefault(); load(); }} className="grid items-end gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Tháng thống kê<Input aria-label="Tháng thống kê" type="month" value={filter.month} onChange={event => setFilter(old => ({ ...old, month: event.target.value }))} className="text-base" /></label>
      <SearchableSelect label="Lọc tài khoản" value={String(filter.accountId ?? "all")} onValueChange={value => setFilter(old => ({ ...old, accountId: value === "all" ? undefined : Number(value) }))} options={[{ value: "all", label: "Tất cả tài khoản" }, ...data.accounts.map(row => ({ value: String(row.id), label: `${row.name} · ${row.username}` }))]} />
      <SearchableSelect label="Lọc kết nối" value={String(filter.connectionId ?? "all")} onValueChange={value => setFilter(old => ({ ...old, connectionId: value === "all" ? undefined : Number(value) }))} options={[{ value: "all", label: "Tất cả kết nối" }, ...data.connections.map(row => ({ value: String(row.id), label: row.name }))]} />
      <div className="flex gap-2"><Input aria-label="Lọc tên model" placeholder="Tên model chính xác (tùy chọn)" value={filter.model ?? ""} onChange={event => setFilter(old => ({ ...old, model: event.target.value || undefined }))} className="min-w-0 text-base" /><Button disabled={pending} type="submit">{pending ? "Đang tải…" : "Áp dụng"}</Button></div>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!result && !error && <p role="status">Đang tải mức sử dụng…</p>}
    {result && <>
      <p className="text-sm text-muted-foreground">Kết quả tháng {result.month}, theo giờ Việt Nam. Chỉ gồm cuộc gọi ghi nhận từ khi bật sổ sử dụng.</p>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Lượt hỏi / lần gọi", `${result.requests} / ${result.total}`], ["Chi phí đã ghi nhận (USD)", result.cost], ["Đang giữ (USD)", result.reserved], ["Lần gọi chưa rõ chi phí", result.unresolved],
      ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border bg-card p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-all text-lg font-semibold">{value}</dd></div>)}</dl>
      <p className="text-sm">Token đã ghi nhận: đầu vào {result.input.toLocaleString("vi-VN")} · cache {result.cached.toLocaleString("vi-VN")} (nằm trong đầu vào) · đầu ra {result.output.toLocaleString("vi-VN")}.</p>
      <p className="text-sm text-muted-foreground">Chi phí tính theo đơn giá đã cấu hình hoặc khoản đối chiếu thủ công. Khoản chưa rõ được giữ dự phòng, không tính là 0.</p>
      <div className="overflow-x-auto rounded-xl border"><table className="min-w-[760px] w-full text-left text-sm"><caption className="sr-only">Nhật ký gọi AI</caption><thead className="bg-muted/50"><tr>{["Tài khoản / Thời gian", "Kết nối / Model", "Trạng thái", "Token vào / cache / ra", "Chi phí / Giữ (USD)", ""].map((label, i) => <th key={i} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>
        {result.rows.map(row => <tr key={row.id} className="border-t align-top"><td className="p-3"><p>{row.account}</p><p className="text-xs text-muted-foreground">{row.username}</p><p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{new Date(row.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></td><td className="min-w-36 max-w-52 break-words p-3">{row.connection}<p className="text-xs text-muted-foreground">{row.model}</p><p className="mt-1 text-xs">{AI_JOB_LABELS[row.job as AiJob] ?? row.job}</p></td><td className="p-3">{statusLabels[row.status] ?? row.status}</td><td className="p-3">{row.input ?? "—"} / {row.cached ?? "—"} / {row.output ?? "—"}</td><td className="p-3 tabular-nums">{row.cost ?? "Chưa rõ"}<p className="text-xs text-muted-foreground">Giữ: {row.reserved ?? "Chưa xác định"}</p></td><td className="p-3">{data.permissions.limits && row.canReconcile && <Button variant="outline" onClick={() => setSelected(row.id)}>Đối chiếu</Button>}</td></tr>)}
        {!result.rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Chưa có lần gọi trong phạm vi này.</td></tr>}
      </tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-muted-foreground">Trang {result.page}/{Math.max(1, Math.ceil(result.total / 25))}</span><div className="flex gap-2"><Button variant="outline" disabled={pending || result.page <= 1} onClick={() => load({ ...filter, page: result.page - 1 })}>Trước</Button><Button variant="outline" disabled={pending || result.page * 25 >= result.total} onClick={() => load({ ...filter, page: result.page + 1 })}>Sau</Button></div></div>
    </>}
    <div className="space-y-2 rounded-xl border bg-muted/30 p-4"><p className="font-medium">Đối soát OpenAI: chưa kết nối</p><p className="text-sm text-muted-foreground">Số dư trả trước chưa xác định. Dữ liệu OpenAI có thể gồm sử dụng ngoài ERP; không cộng vào tổng nội bộ.</p><div className="flex flex-wrap gap-4 text-sm"><a href="https://platform.openai.com/usage" target="_blank" rel="noreferrer" className="text-primary underline">Usage OpenAI</a><a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer" className="text-primary underline">Billing OpenAI</a></div></div>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent onInteractOutside={event => event.preventDefault()} className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Đối chiếu khoản chưa rõ</DialogTitle><DialogDescription>Chỉ nhập chi phí đã kiểm chứng của đúng lần gọi. Thao tác lưu sẽ giải phóng dự phòng và ghi nhật ký.</DialogDescription></DialogHeader>{selected !== null && <ReconcileForm id={selected} done={() => { setSelected(null); load(); }} />}</DialogContent></Dialog>
  </div>;
}
function ReconcileForm({ id, done }: { id: number; done: () => void }) {
  const form = useForm<z.infer<typeof ReconcileAiCallSchema>>({ resolver: zodResolver(ReconcileAiCallSchema), defaultValues: { id, cost: "", reason: "" } });
  const [pending, start] = useTransition(), [error, setError] = useState("");
  return <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(values => start(async () => {
    setError(""); try { const result = await reconcileAiCall(values); if (result.success) { toast.success(result.message); done(); } else setError(result.message); } catch { setError("Chưa xác nhận đối chiếu. Tải lại trước khi thử tiếp."); }
  }))}><FormRequiredHint />
    <FormField control={form.control} name="cost" render={({ field }) => <FormItem><FormLabel required>Chi phí đã đối chiếu (USD)</FormLabel><FormControl><Input {...field} inputMode="decimal" aria-required="true" /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel required>Căn cứ đối chiếu</FormLabel><FormControl><Input {...field} aria-required="true" placeholder="Nguồn và kết quả đã kiểm chứng" /></FormControl><FormMessage /></FormItem>} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={pending} type="submit">{pending ? "Đang lưu…" : "Xác nhận đối chiếu"}</Button>
  </form></Form>;
}
