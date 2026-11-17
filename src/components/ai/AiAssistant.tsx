"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, FilePenLine, Loader2, MessageSquarePlus, Send, Sparkles } from "lucide-react";
import { AiWorkCard } from "@/components/ai/AiWorkCard";
import { listAiChats, getAiChat, archiveAiChat } from "@/actions/ai-chat";
import type { ChatMessage, ChatSummary } from "@/lib/ai-chat";
import { getAiWork } from "@/actions/ai-work";
import { listAiWorks } from "@/actions/ai-work";
import type { AiWorkView } from "@/lib/ai-work";
import { askAi } from "@/actions/ai";
import { AiBudgetSummary } from "@/components/ai/AiBudgetSummary";
import { AiJobSchema, AI_JOBS, AI_JOB_LABELS, type AiJob } from "@/lib/validations/ai-governance";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

const schema = z.object({ message: z.string().trim().min(1, "Nhập yêu cầu của bạn.").max(2000, "Tối đa 2.000 ký tự."), job: AiJobSchema });
type Message = AiMessage & Partial<ChatMessage> & { href?: string };
function rememberChat(id: number | null) {
  const url = new URL(window.location.href); url.searchParams.set("aiChat", id === null ? "new" : String(id));
  window.history.replaceState(null, "", url.pathname + url.search);
}

export function AiAssistant({ settings }: { settings: Pick<AiSettingsView, "hasKey" | "model" | "enabled"> }) {
  const configured = settings.hasKey && Boolean(settings.model) && settings.enabled;
  const router = useRouter();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { message: "", job: "GENERAL" } });
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<{ requestId: string; message: string; conversationId?: number; job: AiJob } | null>(null);
  const [usageRefresh, setUsageRefresh] = useState(0);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatCursor, setChatCursor] = useState<number | null>(null);
  const [messageCursor, setMessageCursor] = useState<number | null>(null);
  const [chatLoading, setChatLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [archivedList, setArchivedList] = useState(false);
  const [archived, setArchived] = useState(false);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await listAiChats({});
        if (!mounted) return;
        if (!result.success) { setError(result.message); return; }
        setChats(result.chats); setChatCursor(result.nextCursor);
        const chosen = new URLSearchParams(window.location.search).get("aiChat");
        const id = chosen === "new" ? null : chosen && /^\d+$/.test(chosen) ? Number(chosen) : result.chats[0]?.id;
        if (id) {
          const detail = await getAiChat({ id }); if (!mounted) return;
          if (!detail.success) { setError(detail.message); return; }
          setConversationId(id); rememberChat(id); setMessages(detail.messages); setMessageCursor(detail.nextCursor); setArchived(detail.chat.archived); setRunning(detail.running);
        }
      } catch { if (mounted) setError("Chưa tải được lịch sử chat. Hãy tải lại danh sách."); }
      finally { if (mounted) setChatLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!running || !conversationId) return;
    let mounted = true;
    const timer = setInterval(() => {
      getAiChat({ id: conversationId }).then(result => {
        if (!mounted) return;
        if (!result.success) { setMessages([]); setError(result.message); setRunning(false); return; }
        setMessages(result.messages); setMessageCursor(result.nextCursor); setRunning(result.running);
      }).catch(() => { if (mounted) { setError("Chưa tải được trạng thái. Bấm Tải lại hội thoại để kiểm tra."); setRunning(false); } });
    }, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [running, conversationId]);
  async function readConversation(id: number, older = false, keepDraft = false) {
    setChatLoading(true); setError("");
    try {
      const result = await getAiChat({ id, ...(older && messageCursor ? { beforeId: messageCursor } : {}) });
      if (!result.success) { setMessages([]); setConversationId(null); rememberChat(null); setRunning(false); setArchived(false); setMessageCursor(null); setDraft(null); setError(result.message); return false; }
      setMessages(previous => older ? [...result.messages, ...previous] : result.messages);
      setConversationId(id); rememberChat(id); setArchived(result.chat.archived); setRunning(result.running); setMessageCursor(result.nextCursor);
      if (!keepDraft) { setDraft(null); setFailed(null); form.reset(); }
      return true;
    } catch { setError("Chưa tải được hội thoại. Nội dung đang nhập vẫn được giữ."); }
    finally { setChatLoading(false); }
  }
  async function loadChats(archive = archivedList, more = false) {
    setChatLoading(true);
    try {
      const result = await listAiChats({ archived: archive, ...(more && chatCursor ? { beforeId: chatCursor } : {}) });
      if (!result.success) { setError(result.message); setChats([]); return; }
      setChats(old => more ? [...old, ...result.chats] : result.chats); setChatCursor(result.nextCursor); setArchivedList(archive);
    } catch { setError("Chưa tải được danh sách hội thoại."); }
    finally { setChatLoading(false); }
  }
  async function archiveCurrent() {
    if (!conversationId) return;
    setChatLoading(true);
    try {
      const result = await archiveAiChat({ id: conversationId, archived: !archived });
      if (!result.success) { setError(result.message); return; }
      setArchived(!archived); await loadChats(archivedList);
    } catch { setError("Chưa xác nhận được trạng thái lưu trữ. Hãy tải lại hội thoại."); }
    finally { setChatLoading(false); }
  }
  const [works, setWorks] = useState<AiWorkView[]>([]);
  const [workError, setWorkError] = useState("");
  const [workLoading, setWorkLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const mergeWorks = (incoming: AiWorkView[]) => setWorks(old => {
    const merged = new Map(old.map(work => [work.id, work]));
    for (const work of incoming) {
      const previous = merged.get(work.id);
      if (!previous || previous.updatedAt <= work.updatedAt) merged.set(work.id, work);
    }
    return [...merged.values()].sort((a, b) => b.id - a.id);
  });
  useEffect(() => {
    let mounted = true;
    listAiWorks({}).then(result => {
      if (!mounted) return;
      if (result.success) { mergeWorks(result.works); setCursor(result.nextCursor); }
      else setWorkError(result.message);
    }).catch(() => { if (mounted) setWorkError("Chưa tải được công việc đã lưu. Hãy tải lại danh sách."); })
      .finally(() => { if (mounted) setWorkLoading(false); });
    return () => { mounted = false; };
  }, []);
  async function loadWorks(more = false) {
    setWorkLoading(true); setWorkError("");
    try {
      const result = await listAiWorks(more && cursor ? { beforeId: cursor } : {});
      if (result.success) { mergeWorks(result.works); setCursor(result.nextCursor); }
      else { setWorks([]); setWorkError(result.message); }
    } catch { setWorkError("Chưa tải được công việc đã lưu. Hãy tải lại danh sách."); }
    finally { setWorkLoading(false); }
  }
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, pending]);
  const submit = form.handleSubmit(({ message, job }) => {
    if (pending || draft || chatLoading || running || archived) return;
    // A transport failure keeps its id; resubmission cannot charge for the same request twice.
    const request = failed?.message === message && failed.job === job ? failed : { requestId: crypto.randomUUID(), message, job, ...(conversationId ? { conversationId } : {}) };
    setError("");
    start(async () => {
      try {
        const result = await askAi(request);
        setFailed(null);
        if ("conversationId" in result && result.conversationId) {
          setConversationId(result.conversationId); rememberChat(result.conversationId);
          if (!await readConversation(result.conversationId, false, true)) return;
          await loadChats(archivedList);
        }
        if (!result.success) { setError(result.message); return; }
        setDraft(result.draft);
        if ("work" in result && result.work) mergeWorks([result.work]);
        form.reset({ message: "", job });
      } catch {
        setFailed(request);
        setError("Mất kết nối. Nội dung đã nhập vẫn được giữ; gửi lại sẽ kiểm tra yêu cầu cũ trước khi gọi AI.");
      } finally { setUsageRefresh(value => value + 1); }
    });
  });
  function saved(id: number) {
    const href = draft?.kind === "asset" ? `/assets?asset=${id}` : "/locations";
    const content = draft?.kind === "asset" ? "Đã lưu hồ sơ tài sản." : "Đã lưu vị trí.";
    setMessages(old => [...old, { role: "assistant", content, href }]);
    setSaving(false); setEditing(false); setDraft(null); router.refresh();
  }
  const workBoard = <div id="ai-work-board" aria-label="Công việc AI đã lưu" className="min-w-0 space-y-3 border-t p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Công việc AI</h3><Button variant="ghost" size="sm" disabled={workLoading} onClick={() => loadWorks()}>Tải lại danh sách</Button></div>
        <p className="text-xs text-muted-foreground">Bảng chờ duyệt và kết quả được lưu theo tài khoản. Chat mới không xóa các công việc này.</p>
        {workLoading && <p role="status" className="text-sm text-muted-foreground">Đang tải công việc…</p>}
        {workError && <p role="alert" className="text-sm text-destructive">{workError}</p>}
        {!workLoading && !workError && !works.length && <p className="text-sm text-muted-foreground">Chưa có công việc. Yêu cầu đặt khấu hao mặc định các loại tài sản để xem bảng trước khi duyệt.</p>}
        {works.map(work => <AiWorkCard key={work.id} work={work} onChange={updated => mergeWorks([updated])} canAdjust={!pending && !draft} onAdjust={text => { form.setValue("message", text); form.setFocus("message"); }} />)}
        {cursor && <Button variant="outline" disabled={workLoading} onClick={() => loadWorks(true)}>Xem công việc trước</Button>}
      </div>;
  return <section className="min-w-0 rounded-2xl border bg-card" aria-label="Trợ lý AI">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Bot className="size-5" /></span><div><h2 className="font-semibold">Trợ lý AI</h2><p className="text-xs text-muted-foreground">Tra cứu và soạn hồ sơ tài sản, vị trí</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" className="min-h-10" disabled={pending || Boolean(draft) || chatLoading || running} onClick={() => { setMessages([]); setConversationId(null); rememberChat(null); setArchived(false); setRunning(false); setMessageCursor(null); setError(""); setFailed(null); form.reset(); }}><MessageSquarePlus className="size-4" />Chat mới</Button></div>
    </div>
    <div className="space-y-3 border-b p-4 sm:p-5">
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-10" aria-expanded={showHistory} onClick={() => { setShowHistory(!showHistory); if (!showHistory) void loadChats(); }}>Lịch sử chat</Button>
        {conversationId && <><Button variant="ghost" className="min-h-10" disabled={pending || chatLoading || Boolean(draft)} onClick={() => readConversation(conversationId)}>Tải lại hội thoại</Button>
          <Button variant="ghost" className="min-h-10" disabled={pending || chatLoading || running || Boolean(draft)} onClick={archiveCurrent}>{archived ? "Khôi phục chat" : "Lưu trữ chat"}</Button></>}
      </div>
      {showHistory && <div className="space-y-2 rounded-lg border p-3" aria-label="Danh sách hội thoại">
        <div className="flex flex-wrap gap-2"><Button variant={!archivedList ? "secondary" : "ghost"} disabled={chatLoading} onClick={() => loadChats(false)}>Đang mở</Button><Button variant={archivedList ? "secondary" : "ghost"} disabled={chatLoading} onClick={() => loadChats(true)}>Đã lưu trữ</Button></div>
        <p className="text-xs text-muted-foreground">Lưu trữ chỉ ẩn khỏi danh sách đang mở, không xóa nội dung.</p>
        {!chats.length && !chatLoading && <p className="text-sm text-muted-foreground">Chưa có hội thoại trong danh sách này.</p>}
        <div className="max-h-60 space-y-1 overflow-y-auto">{chats.map(chat => <Button key={chat.id} variant={chat.id === conversationId ? "secondary" : "ghost"} className="h-auto min-h-10 w-full justify-start whitespace-normal text-left" disabled={pending || chatLoading || Boolean(draft) || running} onClick={() => readConversation(chat.id)}>{chat.title} · {new Date(chat.updatedAt).toLocaleString("vi-VN")}</Button>)}</div>
        {chatCursor && <Button variant="outline" disabled={chatLoading} onClick={() => loadChats(archivedList, true)}>Xem thêm hội thoại</Button>}
      </div>}
      {chatLoading && <p role="status" className="text-sm text-muted-foreground">Đang tải hội thoại…</p>}
      {archived && <p className="text-sm text-muted-foreground">Chat đã lưu trữ. Khôi phục để tiếp tục trao đổi.</p>}
      {running && <p role="status" className="text-sm text-muted-foreground">Một yêu cầu trong chat đang xử lý; trạng thái sẽ tự cập nhật.</p>}
    </div>
    {!configured ? <div className="space-y-3 p-5"><p className="font-medium">{settings.enabled ? "Chưa kết nối AI" : "Kết nối AI đang tạm dừng"}</p><p className="text-sm text-muted-foreground">Kết nối mặc định chưa sẵn sàng. Tác vụ có kết nối riêng vẫn có thể dùng; quản trị cấu hình tại Cài đặt chung → Quản trị AI.</p><Button variant="outline" onClick={() => router.refresh()}>Kiểm tra lại</Button></div> : null}
    <>
      <div role="log" aria-label="Nội dung trao đổi với AI" aria-live="polite" className="max-h-[28rem] min-h-40 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {messageCursor && conversationId && <Button variant="outline" disabled={chatLoading || pending} onClick={() => readConversation(conversationId, true, true)}>Xem tin nhắn trước</Button>}
        {!messages.length && !chatLoading && <div className="space-y-4 py-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4" /><span>Bạn muốn tra cứu hoặc cập nhật hồ sơ nào?</span></div><div className="flex flex-wrap gap-2">{["Tìm máy in ở phòng HCNS", "Tôi muốn thêm một thiết bị", "Đặt khấu hao mặc định tất cả loại tài sản thành 5 năm"].map(text => <Button key={text} variant="outline" className="h-auto min-h-10 whitespace-normal text-left" onClick={() => { form.setValue("message", text); form.setFocus("message"); }}>{text}</Button>)}</div></div>}
        {messages.map((m, i) => <div key={i} className={cn("max-w-full rounded-xl p-3 text-sm", m.role === "user" ? "ml-4 bg-primary/10 sm:ml-12" : "mr-4 bg-muted/60 sm:mr-12")}><p className="mb-1 text-xs font-medium text-muted-foreground">{m.role === "user" ? "Bạn" : "Trợ lý"}</p><p className="whitespace-pre-wrap break-words">{m.content || (m.status === "DANG_XU_LY" ? "Đang xử lý…" : "")}</p>{m.resultLists?.map((list, index) => <div key={index} className="mt-3 rounded-lg border p-3"><p className="mb-2 text-xs font-medium">{list.label} · Thứ tự tham chiếu</p><ol className="max-h-40 list-decimal space-y-1 overflow-y-auto pl-5">{list.items.map((label, position) => <li key={position} className="break-words text-sm">{label}</li>)}</ol></div>)}{m.contextTruncated && <p className="mt-2 text-xs text-muted-foreground">Lượt này chỉ dùng phần lịch sử gần đây; hãy nhắc lại đối tượng nếu cần.</p>}{m.draft && <p className="mt-2 text-xs text-muted-foreground">Bản nháp chưa chứng minh hồ sơ đã lưu. Khi mở lại chat, bạn có thể yêu cầu AI lập lại.</p>}{(m.status === "LOI" || m.status === "GIAN_DOAN") && <Button variant="outline" className="mt-2 min-h-10" disabled={pending || chatLoading || Boolean(draft) || archived} onClick={() => { const question = messages.find(q => q.requestId === m.requestId && q.role === "user"); if (question) { form.setValue("message", question.content); setFailed(null); form.setFocus("message"); } }}>Dùng lại yêu cầu</Button>}{m.workId && <Button variant="outline" className="mt-2 min-h-10" onClick={async () => { try { const result = await getAiWork({ id: m.workId }); if (result.success) { mergeWorks([result.work]); document.getElementById("ai-work-board")?.scrollIntoView({ behavior: "smooth" }); } else setError(result.message); } catch { setError("Chưa tải được công việc."); } }}>Xem công việc đã lập</Button>}{m.href && <Link className="mt-2 inline-flex min-h-10 items-center font-medium text-primary underline underline-offset-4" href={m.href}>Mở hồ sơ</Link>}</div>)}
        {pending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang đọc yêu cầu và tra cứu…</p>}
        <div ref={bottom} />
      </div>
      {draft && <div className="mx-4 mb-4 space-y-3 rounded-xl border bg-background p-4 sm:mx-5"><p className="flex items-center gap-2 font-medium"><FilePenLine className="size-4 text-primary" />{draft.row ? "Cập nhật" : "Thêm"} {draft.kind === "asset" ? "tài sản" : "vị trí"} · Chưa lưu</p>
        <dl className="space-y-2">{draft.changes.map((change, index) => <div key={index} className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{change.label}</dt><dd className="min-w-0 break-words"><span className="line-clamp-2 text-muted-foreground">{change.before}</span><span className="line-clamp-3">→ {change.after}</span></dd></div>)}</dl>
        <div className="flex flex-wrap gap-2"><Button className="min-h-10" onClick={() => setEditing(true)}>Kiểm tra và lưu</Button><Button variant="outline" className="min-h-10" onClick={() => { setDraft(null); setMessages(old => [...old, { role: "assistant", content: "Đã bỏ bản nháp; hồ sơ giữ nguyên." }]); }}>Bỏ bản nháp</Button></div>
      </div>}
      {workBoard}
      <Form {...form}><form noValidate onSubmit={submit} className="space-y-3 border-t p-4 sm:p-5">
        <AiBudgetSummary refreshKey={usageRefresh} />
        <FormField control={form.control} name="job" render={({ field }) => <FormItem><FormLabel>Tác vụ AI</FormLabel><FormControl><SearchableSelect ref={field.ref} onBlur={field.onBlur} label="Tác vụ AI" value={field.value} onValueChange={field.onChange} disabled={pending || running || Boolean(draft)} options={AI_JOBS.map(job => ({ value: job, label: AI_JOB_LABELS[job] }))} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel className="sr-only" required>Yêu cầu AI</FormLabel><FormControl><Textarea {...field} aria-required="true" rows={3} maxLength={2000} disabled={pending || Boolean(draft) || chatLoading || running || archived} placeholder="Ví dụ: Đổi tên máy in … thành …" className="resize-y text-base" /></FormControl><FormMessage /></FormItem>} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-md text-xs text-muted-foreground">Hội thoại và công việc được lưu riêng theo tài khoản. Cài đặt AI trong hồ sơ áp dụng từ lượt hỏi tiếp theo. Nội dung yêu cầu và hồ sơ liên quan được gửi đến dịch vụ AI.{draft ? " Lưu hoặc bỏ bản nháp để hỏi tiếp." : ""}</p><Button type="submit" disabled={pending || Boolean(draft) || chatLoading || running || archived} className="min-h-10">{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Gửi yêu cầu</Button></div>
      </form></Form>
    </>
    <Dialog open={editing} onOpenChange={value => { if (!saving) setEditing(value); }}><DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-2xl" showCloseButton={!saving} onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (saving) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>Kiểm tra hồ sơ trước khi lưu</DialogTitle><DialogDescription>Bạn có thể sửa nội dung AI đã điền. Bấm Lưu để cập nhật hồ sơ.</DialogDescription></DialogHeader>
      {draft?.kind === "asset" && <AssetForm row={draft.row} categories={draft.categories} initialValues={draft.values} onBusy={setSaving} onCancel={() => setEditing(false)} onSaved={saved} />}
      {draft?.kind === "location" && <LocationForm rows={draft.rows} editing={{ row: draft.row ?? undefined, parentId: draft.row?.parent_id ?? draft.values.parentId }} initialValues={draft.values} onBusy={setSaving} onCancel={() => setEditing(false)} onSaved={saved} />}
    </DialogContent></Dialog>
  </section>;
}
