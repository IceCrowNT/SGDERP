"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, FilePenLine, Loader2, MessageSquarePlus, Send, Sparkles } from "lucide-react";
import { askAi } from "@/actions/ai";
import type { AiMessage } from "@/lib/ai-pilot";
import type { AiDraft } from "@/lib/ai-pilot-tools";
import { AssetForm } from "@/components/assets/AssetForm";
import { LocationForm } from "@/components/locations/LocationForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AiSettingsView } from "@/lib/validations/ai-settings";

const schema = z.object({ message: z.string().trim().min(1, "Nhập yêu cầu của bạn.").max(2000, "Tối đa 2.000 ký tự.") });
type Message = AiMessage & { href?: string };

export function AiAssistant({ settings }: { settings: Pick<AiSettingsView, "hasKey" | "model" | "enabled"> }) {
  const configured = settings.hasKey && Boolean(settings.model) && settings.enabled;
  const router = useRouter();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { message: "" } });
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<{ requestId: string; message: string; history: AiMessage[] } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, pending]);
  const submit = form.handleSubmit(({ message }) => {
    if (pending || draft || !configured) return;
    const history = messages.slice(-24).map(({ role, content }) => ({ role, content }));
    // A transport failure keeps its id; resubmission cannot charge for the same request twice.
    const request = failed?.message === message ? failed : { requestId: crypto.randomUUID(), message, history };
    setError("");
    start(async () => {
      try {
        const result = await askAi(request);
        setFailed(null);
        if (!result.success) { setError(result.message); return; }
        setMessages(old => [...old, { role: "user", content: message }, { role: "assistant", content: result.text }]);
        setDraft(result.draft);
        form.reset({ message: "" });
      } catch {
        setFailed(request);
        setError("Mất kết nối. Nội dung đã nhập vẫn được giữ; gửi lại sẽ kiểm tra yêu cầu cũ trước khi gọi AI.");
      }
    });
  });
  function saved(id: number) {
    const href = draft?.kind === "asset" ? `/assets?asset=${id}` : "/locations";
    const content = draft?.kind === "asset" ? "Đã lưu hồ sơ tài sản." : "Đã lưu vị trí.";
    setMessages(old => [...old, { role: "assistant", content, href }]);
    setSaving(false); setEditing(false); setDraft(null); router.refresh();
  }
  return <section className="min-w-0 rounded-2xl border bg-card" aria-label="Trợ lý AI">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Bot className="size-5" /></span><div><h2 className="font-semibold">Trợ lý AI</h2><p className="text-xs text-muted-foreground">Tra cứu và soạn hồ sơ tài sản, vị trí</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" className="min-h-10" disabled={pending || Boolean(draft)} onClick={() => { setMessages([]); setError(""); setFailed(null); form.reset(); }}><MessageSquarePlus className="size-4" />Chat mới</Button></div>
    </div>
    {!configured ? <div className="space-y-3 p-5"><p className="font-medium">{settings.enabled ? "Chưa kết nối AI" : "Kết nối AI đang tạm dừng"}</p><p className="text-sm text-muted-foreground">Liên hệ người quản trị để thiết lập hoặc bật kết nối tại Cài đặt chung → Quản trị AI.</p><Button variant="outline" onClick={() => router.refresh()}>Kiểm tra lại</Button></div> : <>
      <div role="log" aria-label="Nội dung trao đổi với AI" aria-live="polite" className="max-h-[28rem] min-h-40 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {!messages.length && <div className="space-y-4 py-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4" /><span>Bạn muốn tra cứu hoặc cập nhật hồ sơ nào?</span></div><div className="flex flex-wrap gap-2">{["Tìm máy in ở phòng HCNS", "Tôi muốn thêm một thiết bị", "Tôi muốn sửa thông tin vị trí"].map(text => <Button key={text} variant="outline" className="h-auto min-h-10 whitespace-normal text-left" onClick={() => { form.setValue("message", text); form.setFocus("message"); }}>{text}</Button>)}</div></div>}
        {messages.map((m, i) => <div key={i} className={cn("max-w-full rounded-xl p-3 text-sm", m.role === "user" ? "ml-4 bg-primary/10 sm:ml-12" : "mr-4 bg-muted/60 sm:mr-12")}><p className="mb-1 text-xs font-medium text-muted-foreground">{m.role === "user" ? "Bạn" : "Trợ lý"}</p><p className="whitespace-pre-wrap break-words">{m.content}</p>{m.href && <Link className="mt-2 inline-flex min-h-10 items-center font-medium text-primary underline underline-offset-4" href={m.href}>Mở hồ sơ</Link>}</div>)}
        {pending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang đọc yêu cầu và tra cứu…</p>}
        <div ref={bottom} />
      </div>
      {draft && <div className="mx-4 mb-4 space-y-3 rounded-xl border bg-background p-4 sm:mx-5"><p className="flex items-center gap-2 font-medium"><FilePenLine className="size-4 text-primary" />{draft.row ? "Cập nhật" : "Thêm"} {draft.kind === "asset" ? "tài sản" : "vị trí"} · Chưa lưu</p>
        <dl className="space-y-2">{draft.changes.map((change, index) => <div key={index} className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{change.label}</dt><dd className="min-w-0 break-words"><span className="line-clamp-2 text-muted-foreground">{change.before}</span><span className="line-clamp-3">→ {change.after}</span></dd></div>)}</dl>
        <div className="flex flex-wrap gap-2"><Button className="min-h-10" onClick={() => setEditing(true)}>Kiểm tra và lưu</Button><Button variant="outline" className="min-h-10" onClick={() => { setDraft(null); setMessages(old => [...old, { role: "assistant", content: "Đã bỏ bản nháp; hồ sơ giữ nguyên." }]); }}>Bỏ bản nháp</Button></div>
      </div>}
      <Form {...form}><form noValidate onSubmit={submit} className="space-y-3 border-t p-4 sm:p-5">
        <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel className="sr-only" required>Yêu cầu AI</FormLabel><FormControl><Textarea {...field} aria-required="true" rows={3} maxLength={2000} disabled={pending || Boolean(draft)} placeholder="Ví dụ: Đổi tên máy in … thành …" className="resize-y text-base" /></FormControl><FormMessage /></FormItem>} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-md text-xs text-muted-foreground">Cuộc chat chỉ giữ khi trang đang mở. Nội dung yêu cầu và hồ sơ liên quan được gửi đến dịch vụ AI.{draft ? " Lưu hoặc bỏ bản nháp để hỏi tiếp." : ""}</p><Button type="submit" disabled={pending || Boolean(draft)} className="min-h-10">{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Gửi yêu cầu</Button></div>
      </form></Form>
    </>}
    <Dialog open={editing} onOpenChange={value => { if (!saving) setEditing(value); }}><DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-2xl" showCloseButton={!saving} onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (saving) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>Kiểm tra hồ sơ trước khi lưu</DialogTitle><DialogDescription>Bạn có thể sửa nội dung AI đã điền. Bấm Lưu để cập nhật hồ sơ.</DialogDescription></DialogHeader>
      {draft?.kind === "asset" && <AssetForm row={draft.row} categories={draft.categories} initialValues={draft.values} onBusy={setSaving} onCancel={() => setEditing(false)} onSaved={saved} />}
      {draft?.kind === "location" && <LocationForm rows={draft.rows} editing={{ row: draft.row ?? undefined, parentId: draft.row?.parent_id ?? draft.values.parentId }} initialValues={draft.values} onBusy={setSaving} onCancel={() => setEditing(false)} onSaved={saved} />}
    </DialogContent></Dialog>
  </section>;
}
