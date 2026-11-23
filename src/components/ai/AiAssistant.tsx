"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode, type FormEvent, Fragment } from "react";
import Link from "next/link";
import { AiAttachmentPicker, AiFileLinks, AiDataTables, type AttachmentPickerHandle } from "@/components/ai/AiAttachments";
import type { AiAttachment } from "@/lib/ai-attachments";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FilePenLine, History, Loader2, Maximize2, MessageSquarePlus, Minimize2, PanelRight, Paperclip, RefreshCw, Send, X } from "lucide-react";
import { DashboardWorkspace, openAssistant } from "@/components/ai/DashboardWorkspace";
import { AiOfficePanel } from "@/components/ai/AiOfficePanel";
import { AiChatActions } from "@/components/ai/AiChatActions";
import { AiMessageText } from "@/components/ai/AiMessageText";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AiWorkCard } from "@/components/ai/AiWorkCard";
import { listAiChats, getAiChat, archiveAiChat } from "@/actions/ai-chat";
import type { ChatMessage, ChatSummary, ChatListCursor } from "@/lib/ai-chat";
import { getAiWork } from "@/actions/ai-work";
import { listAiWorks } from "@/actions/ai-work";
import { workStatusLabels, type AiWorkView } from "@/lib/ai-work";
import { askAi } from "@/actions/ai";
import { AiJobSchema, AI_JOBS, AI_JOB_LABELS, type AiJob } from "@/lib/validations/ai-governance";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { AiMessage } from "@/lib/ai-pilot";
import { AiSupportTicket } from "./AiSupportTicket";
import { supportDraft, type SupportTarget } from "@/lib/ai-support-task";
import type { AiDraft } from "@/lib/ai-pilot-tools";
import { AssetForm } from "@/components/assets/AssetForm";
import { InventoryItemForm } from "@/components/inventory/InventoryForms";
import { InventoryTransactionForm } from "@/components/inventory/InventoryTransactionForm";
import { LocationForm } from "@/components/locations/LocationForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AiSettingsView } from "@/lib/validations/ai-settings";

const ignoreDraftBlocked = () => {};

const schema = z.object({ message: z.string().trim().min(1, "Nhập yêu cầu của bạn.").max(2000, "Tối đa 2.000 ký tự."), job: AiJobSchema });
type Message = AiMessage & Partial<ChatMessage> & { href?: string };
function rememberChat(id: number | null) {
  const url = new URL(window.location.href); url.searchParams.set("aiChat", id === null ? "new" : String(id));
  window.history.replaceState(null, "", url.pathname + url.search);
}

export function AiAssistant({ settings, workflow }: { settings: Pick<AiSettingsView, "hasKey" | "model" | "enabled">; workflow: ReactNode }) {
  const params = useSearchParams();
  const selectedWorkId = Number(params.get("aiWork")) || null;
  const [document, setDocument] = useState<AiAttachment | null>(null);
  const [documentLocked, setDocumentLocked] = useState(false);
  function openDocument(file: AiAttachment) {
    if (documentLocked) { setError("Lưu tài liệu đang sửa trước khi mở tệp khác."); return; }
    setDocument(file); setMobilePanel(true);
  }
  const [draftVisible, setDraftVisible] = useState(true);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(Boolean(params.get("aiWork")));
  function selectWork(id: number | null) {
    if (documentLocked) { setError("Lưu tài liệu trước khi chuyển công việc."); return; }
    setDocument(null);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("aiWork", String(id)); else url.searchParams.delete("aiWork");
    window.history.replaceState(null, "", url.pathname + url.search);
    setDraftVisible(false); setMobilePanel(Boolean(id));
  }
  const configured = settings.hasKey && Boolean(settings.model) && settings.enabled;
  const router = useRouter();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { message: "", job: "GENERAL" } });
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [historyDate, setHistoryDate] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setHistoryDate(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [showFiles, setShowFiles] = useState(false);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const messageValue = useWatch({ control: form.control, name: "message" });
  useEffect(() => {
    const node = messageInput.current; if (!node) return;
    let width = 0;
    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      if (nextWidth <= 0 || nextWidth === width) return;
      width = nextWidth; node.style.height = "auto"; node.style.height = `${Math.min(node.scrollHeight, 144)}px`;
    });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => { const node = messageInput.current; if (node) { node.style.height = "auto"; node.style.height = `${Math.min(node.scrollHeight, 144)}px`; } }, [messageValue]);
  const [conversationFiles, setConversationFiles] = useState<AiAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const attachmentPicker = useRef<AttachmentPickerHandle>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<{ requestId: string; message: string; conversationId?: number; job: AiJob; attachmentIds: number[] } | null>(null);
  const [conversationTitle, setConversationTitle] = useState("Chat mới");
  const [historyPinned, setHistoryPinned] = useState(true);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatCursor, setChatCursor] = useState<ChatListCursor | null>(null);
  const [messageCursor, setMessageCursor] = useState<number | null>(null);
  const [chatLoading, setChatLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const historyRequest = useRef(0);
  const [archiving, setArchiving] = useState(false);
  const archiveInFlight = useRef(false);
  const historyButton = useRef<HTMLButtonElement>(null);
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
          setConversationId(id); setConversationFiles(detail.attachments); setConversationTitle(detail.chat.title); rememberChat(id); setMessages(detail.messages); setMessageCursor(detail.nextCursor); setArchived(detail.chat.archived); setRunning(detail.running);
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
        if (!result.success) { setMessages([]); setConversationTitle("Cuộc trò chuyện không khả dụng"); setError(result.message); setRunning(false); return; }
        setMessages(result.messages); setMessageCursor(result.nextCursor); setRunning(result.running);
      }).catch(() => { if (mounted) { setError("Chưa tải được trạng thái. Bấm Tải lại hội thoại để kiểm tra."); setRunning(false); } });
    }, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [running, conversationId]);
  async function readConversation(id: number, older = false, keepDraft = false) {
    if (id !== conversationId && documentLocked) { setError("Lưu tài liệu trước khi đổi cuộc chat."); return false; }
    if (id !== conversationId) setDocument(null);
    setChatLoading(true); setError("");
    try {
      const result = await getAiChat({ id, ...(older && messageCursor ? { beforeId: messageCursor } : {}) });
      if (!result.success) { setShowFiles(false); setMessages([]); setConversationId(null); setConversationTitle("Chat mới"); setConversationFiles([]); rememberChat(null); setRunning(false); setArchived(false); setMessageCursor(null); setDraft(null); setError(result.message); return false; }
      setMessages(previous => older ? [...result.messages, ...previous] : result.messages);
      setConversationId(id); setConversationFiles(result.attachments); setConversationTitle(result.chat.title); rememberChat(id); setArchived(result.chat.archived); setRunning(result.running); setMessageCursor(result.nextCursor);
      if (!keepDraft) { setDraft(null); setFailed(null); form.reset(); }
      return true;
    } catch { setError("Chưa tải được hội thoại. Nội dung đang nhập vẫn được giữ."); }
    finally { setChatLoading(false); }
  }
  const restoreHistory = useEffectEvent(() => {
    const chosen = new URLSearchParams(window.location.search).get("aiChat");
    if (!chosen || (chosen === "new" ? conversationId === null : Number(chosen) === conversationId)) return;
    if (documentLocked || uploading || attachments.length || pending || running || chatLoading || archiving || draft || form.getValues("message").trim()) {
      rememberChat(conversationId);
      return;
    }
    if (chosen === "new") { setConversationId(null); setConversationTitle("Chat mới"); setConversationFiles([]); setMessages([]); setArchived(false); setMessageCursor(null); setFailed(null); setError(""); }
    else if (/^\d+$/.test(chosen)) void readConversation(Number(chosen));
  });
  useEffect(() => {
    const onPopState = () => restoreHistory();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  async function loadChats(archive = archivedList, more = false) {
    const request = ++historyRequest.current;
    setHistoryLoading(true); setHistoryError("");
    try {
      const result = await listAiChats({ archived: archive, ...(more && chatCursor ? { cursor: chatCursor } : {}) });
      if (request !== historyRequest.current) return;
      if (!result.success) { setChats([]); setChatCursor(null); setHistoryError(result.message); return; }
      setChats(old => more ? [...new Map([...old, ...result.chats].map(chat => [chat.id, chat])).values()]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id) : result.chats); setChatCursor(result.nextCursor); setArchivedList(archive);
    } catch { if (request === historyRequest.current) setHistoryError("Chưa tải được lịch sử. Hãy thử lại."); }
    finally { if (request === historyRequest.current) setHistoryLoading(false); }
  }
  async function archiveCurrent(nextArchived: boolean, id = conversationId) {
    if (documentLocked || !id || archiveInFlight.current || pending || running || chatLoading || draft) return;
    archiveInFlight.current = true; setArchiving(true); setError("");
    try {
      const result = await archiveAiChat({ id, archived: nextArchived });
      if (!result.success) { setError(result.message); return; }
      if (id === conversationId) setArchived(nextArchived);
      // Refreshing the history list must not keep the composer locked.
      void loadChats(archivedList);
    } catch { setError("Chưa xác nhận được trạng thái lưu trữ. Hãy thử lại hoặc tải lại hội thoại."); }
    finally { archiveInFlight.current = false; setArchiving(false); }
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
  const selectedWork = works.find(work => work.id === selectedWorkId);
  const showDraft = Boolean(draft && draftVisible);
  const hasPanel = Boolean(document) || showDraft || Boolean(selectedWorkId);
  useEffect(() => {
    if (!selectedWorkId) return;
    let active = true;
    getAiWork({ id: selectedWorkId }).then(result => {
      if (!active) return;
      if (result.success) mergeWorks([result.work]);
      else { setWorks(old => old.filter(work => work.id !== selectedWorkId)); setWorkError(result.message); }
    }).catch(() => { if (active) setWorkError("Chưa tải được công việc. Hãy tải lại danh sách."); });
    return () => { active = false; };
  }, [selectedWorkId]);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, pending]);
  const sendMessage = ({ message, job }: z.infer<typeof schema>) => {
    if (documentLocked || uploading || pending || draft || chatLoading || archiving || running || archived) return;
    // A transport failure keeps its id; resubmission cannot charge for the same request twice.
    const attachmentIds = attachments.map(f => f.id).sort((a,b) => a-b);
    const request = failed?.message === message && failed.job === job && JSON.stringify(failed.attachmentIds) === JSON.stringify(attachmentIds) ? failed : { requestId: crypto.randomUUID(), message, job, attachmentIds, ...(conversationId ? { conversationId } : {}) };
    setError("");
    start(async () => {
      try {
        const result = await askAi(request);
        setFailed(null);
        if ("conversationId" in result && result.conversationId) {
          setConversationId(result.conversationId); rememberChat(result.conversationId);
          setAttachments([]);
          if (!await readConversation(result.conversationId, false, true)) return;
          await loadChats(archivedList);
        }
        if (!result.success) { setError(result.message); return; }
        setDraft(result.draft);
        if (result.draft) { selectWork(null); setDraftVisible(true); setMobilePanel(true); }
        if ("work" in result && result.work) { mergeWorks([result.work]); selectWork(result.work.id); }
        form.reset({ message: "", job });
      } catch {
        setFailed(request);
        setError("Mất kết nối. Nội dung đã nhập vẫn được giữ; gửi lại sẽ kiểm tra yêu cầu cũ trước khi gọi AI.");
      }
    });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => form.handleSubmit(sendMessage)(event);
  function chooseSupportTarget(target: SupportTarget) {
    const choice = `Chọn ${target.kind === "people" ? "người" : "phòng"} tiếp nhận: ${target.name} (${target.code})${target.position ? ` — ${target.position}` : ""}${target.department ? `, ${target.department}` : ""}. Hãy soạn bản nháp cho yêu cầu hỗ trợ đang trao đổi.`;
    const existing = form.getValues("message").trim();
    form.setValue("message", existing ? `${existing}\n${choice}` : choice, { shouldValidate: true });
    // Preserve unsent text/files for review; a standalone selection continues the current chat immediately.
    if (existing || attachments.length) { form.setFocus("message"); return; }
    void form.handleSubmit(sendMessage)();
  }
  function saved(id: number) {
    const inventoryKind = draft?.kind === "inventory-item" ? draft.inventoryKind : draft?.kind === "inventory-transaction" ? draft.row.loai_vat_tu.hang_muc : null;
    const href = draft?.kind === "support-ticket" ? `/tasks/${id}` : inventoryKind ? `/inventory?kind=${inventoryKind}&item=${id}` : draft?.kind === "asset" ? `/assets?asset=${id}` : "/locations";
    const content = draft?.kind === "support-ticket" ? "Đã gửi yêu cầu hỗ trợ." : draft?.kind === "inventory-item" ? "Đã lưu mặt hàng vật tư." : draft?.kind === "inventory-transaction" ? "Đã ghi nhận giao dịch vật tư." : draft?.kind === "asset" ? "Đã lưu hồ sơ tài sản." : "Đã lưu vị trí.";
    setMessages(old => [...old, { role: "assistant", content, href }]);
    setSaving(false); setEditing(false); setDraft(null); router.refresh();
  }
  const workBoard = <section id="ai-work-board" aria-label="Công việc AI đã lưu" className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Công việc AI</h3><Button variant="ghost" size="sm" disabled={workLoading} onClick={() => loadWorks()}>Tải lại danh sách</Button></div>
        <p className="text-xs text-muted-foreground">Bảng chờ duyệt và kết quả được lưu theo tài khoản. Chat mới không xóa các công việc này.</p>
        {workLoading && <p role="status" className="text-sm text-muted-foreground">Đang tải công việc…</p>}
        {workError && <p role="alert" className="text-sm text-destructive">{workError}</p>}
        {!workLoading && !workError && !works.length && <p className="text-sm text-muted-foreground">Chưa có công việc.</p>}
        <div className="divide-y">{works.map(work => <Button key={work.id} variant="ghost" className="h-auto min-h-14 w-full justify-between gap-3 rounded-none py-3 text-left whitespace-normal" onClick={() => { selectWork(work.id); openAssistant(); }}><span className="min-w-0"><span className="block font-medium">{work.kind === "NHAP_VAT_TU" ? "Ghi nhận hàng vừa mua" : "Khấu hao mặc định loại tài sản"}</span><span className="block text-xs text-muted-foreground">{work.kind === "NHAP_VAT_TU" ? `${work.snapshot.rows.length} mặt hàng` : `${work.snapshot.months} tháng · ${work.snapshot.rows.length} loại`} · {new Date(work.createdAt).toLocaleString("vi-VN")}</span></span><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{workStatusLabels[work.status]}</span></Button>)}</div>
        {cursor && <Button variant="outline" disabled={workLoading} onClick={() => loadWorks(true)}>Xem công việc trước</Button>}
      </section>;
  const historyBusy = documentLocked || uploading || attachments.length > 0 || pending || chatLoading || archiving || Boolean(draft) || running;
  const onRenamed = (id: number, title: string) => {
    setChats(old => old.map(chat => chat.id === id ? { ...chat, title } : chat));
    if (id === conversationId) setConversationTitle(title);
    void loadChats();
  };
  const dayKey = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
  const today = dayKey(new Date(historyDate)), yesterday = dayKey(new Date(historyDate - 86400000));
  const group = (date: string) => dayKey(new Date(date)) === today ? "Hôm nay" : dayKey(new Date(date)) === yesterday ? "Hôm qua" : "Trước đó";
  const historyContent = (
      <div className="space-y-3 p-3">
      <div className="space-y-2" aria-label="Danh sách hội thoại">
        <div className="flex items-center gap-1"><Button variant={!archivedList ? "secondary" : "ghost"} className="min-h-10" disabled={historyLoading} onClick={() => loadChats(false)}>Đang mở</Button><Button variant={archivedList ? "secondary" : "ghost"} className="min-h-10" disabled={historyLoading} onClick={() => loadChats(true)}>Đã lưu trữ</Button><Button variant="ghost" size="icon" className="ml-auto size-10 shrink-0" aria-label="Tải lại danh sách hội thoại" disabled={historyLoading} onClick={() => loadChats()}><RefreshCw className="size-4" aria-hidden="true" /></Button></div>
        {historyLoading && <p role="status" className="text-sm text-muted-foreground">Đang tải lịch sử…</p>}
        {historyError && <div role="alert" className="text-sm text-destructive">{historyError}<Button variant="ghost" className="ml-2 min-h-10" disabled={historyLoading} onClick={() => loadChats()}>Thử lại</Button></div>}
        {!chats.length && !historyLoading && <p className="text-sm text-muted-foreground">Chưa có hội thoại trong danh sách này.</p>}
        <div className="space-y-1">{chats.map((chat, index) => <Fragment key={chat.id}>
          {(index === 0 || group(chats[index - 1].updatedAt) !== group(chat.updatedAt)) && <h4 className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground">{group(chat.updatedAt)}</h4>}
          <div className={cn("flex min-w-0 items-center rounded-lg", chat.id === conversationId && "bg-secondary")}>
            <Button variant="ghost" aria-current={chat.id === conversationId ? "page" : undefined} title={chat.title} className="h-auto min-h-11 min-w-0 flex-1 justify-start px-2 py-2 text-left" disabled={historyBusy} onClick={async () => { if (await readConversation(chat.id)) { setShowHistory(false); setShowFiles(false); selectWork(null); } }}><span className="truncate font-medium">{chat.title}</span></Button>
            <AiChatActions chat={chat} disabled={historyBusy} onArchive={() => archiveCurrent(!chat.archived, chat.id)} onRenamed={onRenamed} />
          </div>
        </Fragment>)}</div>
        {chatCursor && <Button variant="outline" disabled={historyLoading} onClick={() => loadChats(archivedList, true)}>Xem thêm hội thoại</Button>}
      </div>
      </div>
  );
  const desktopHistoryVisible = historyPinned && !hasPanel;
  const assistant = <div className="flex h-full min-h-0 min-w-0 gap-3">
    <aside aria-label="Lịch sử hội thoại" className={cn("hidden min-h-0 w-64 shrink-0 flex-col overflow-hidden rounded-xl border bg-card", desktopHistoryVisible && "lg:flex")}>
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b px-3"><h3 className="text-sm font-semibold">Lịch sử chat</h3><Button variant="ghost" size="icon" className="size-10" aria-label="Thu gọn lịch sử" onClick={() => setHistoryPinned(false)}><X className="size-4" /></Button></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{historyContent}</div>
    </aside>
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card" aria-label="Trợ lý AI">
    <div className="flex min-h-14 shrink-0 items-center gap-2 border-b px-3 py-2">
      <Button ref={historyButton} variant="ghost" size="icon" className="size-10 shrink-0 lg:hidden" aria-label="Lịch sử chat" aria-expanded={showHistory} onClick={() => { setShowHistory(true); void loadChats(); }}><History className="size-4" /></Button>
      <Button variant="ghost" size="icon" className="hidden size-10 shrink-0 lg:inline-flex" disabled={documentLocked} aria-label="Lịch sử chat" title="Lịch sử chat" aria-expanded={desktopHistoryVisible} onClick={() => { if (desktopHistoryVisible) setHistoryPinned(false); else { selectWork(null); setDraftVisible(false); setHistoryPinned(true); void loadChats(); } }}><History className="size-4" /></Button>
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold" title={conversationTitle}>{conversationTitle}</h2>
      {conversationFiles.length > 0 && <Button type="button" variant={showFiles ? "secondary" : "ghost"} className="min-h-10 shrink-0 px-2" aria-label={`Tệp trong cuộc chat (${conversationFiles.length})`} aria-expanded={showFiles} aria-controls="ai-conversation-files" onClick={() => setShowFiles(value => !value)}><Paperclip aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Tệp</span><span>{conversationFiles.length}</span></Button>}
      {conversationId && <AiChatActions label="Thao tác cuộc chat" chat={{ id: conversationId, title: conversationTitle, archived }} disabled={historyBusy} onArchive={() => archiveCurrent(!archived)} onRenamed={onRenamed} onRefresh={() => readConversation(conversationId, false, true)} />}
      <Button variant="ghost" className="min-h-10 shrink-0" disabled={documentLocked || uploading || attachments.length > 0 || pending || Boolean(draft) || chatLoading || archiving || running} onClick={() => { setShowFiles(false); setMessages([]); setConversationId(null); setConversationTitle("Chat mới"); setConversationFiles([]); rememberChat(null); selectWork(null); setArchived(false); setRunning(false); setMessageCursor(null); setError(""); setFailed(null); form.reset(); }}><MessageSquarePlus className="size-4" /><span className="hidden sm:inline">Chat mới</span><span className="sr-only sm:hidden">Chat mới</span></Button>
    </div>
    <Sheet open={showHistory} onOpenChange={setShowHistory}><SheetContent side="left" className="w-[min(24rem,95vw)] overflow-y-auto [&>button]:inline-flex [&>button]:size-10 [&>button]:items-center [&>button]:justify-center" onCloseAutoFocus={event => { event.preventDefault(); historyButton.current?.focus(); }}>
      <SheetHeader><SheetTitle>Lịch sử chat</SheetTitle><SheetDescription>Hội thoại riêng của bạn.</SheetDescription></SheetHeader>
      {historyContent}
    </SheetContent></Sheet>
    {showFiles && conversationFiles.length > 0 && <div id="ai-conversation-files" role="region" aria-label="Tệp trong cuộc chat" className="max-h-40 shrink-0 overflow-y-auto border-b px-4 py-3"><AiFileLinks files={conversationFiles} onOpen={openDocument} /></div>}
    <div className="shrink-0 px-4 text-xs text-muted-foreground">
      {chatLoading && <p role="status" className="text-sm text-muted-foreground">Đang tải hội thoại…</p>}
      {running && <p role="status" className="text-sm text-muted-foreground">Một yêu cầu trong chat đang xử lý; trạng thái sẽ tự cập nhật.</p>}
    </div>
    {!configured ? <div className="space-y-3 p-5"><p className="font-medium">{settings.enabled ? "Chưa kết nối AI" : "Kết nối AI đang tạm dừng"}</p><p className="text-sm text-muted-foreground">Kết nối mặc định chưa sẵn sàng. Tác vụ có kết nối riêng vẫn có thể dùng; quản trị cấu hình tại Cài đặt chung → Quản trị AI.</p><Button variant="outline" onClick={() => router.refresh()}>Kiểm tra lại</Button></div> : null}
    {hasPanel && <div className="flex shrink-0 gap-2 border-b p-2 xl:hidden" aria-label="Vùng làm việc AI">
      <Button variant={!mobilePanel ? "secondary" : "ghost"} aria-pressed={!mobilePanel} onClick={() => setMobilePanel(false)}>Trao đổi</Button>
      <Button variant={mobilePanel ? "secondary" : "ghost"} aria-pressed={mobilePanel} onClick={() => setMobilePanel(true)}>{document ? "Tài liệu" : "Bảng công việc"}</Button>
    </div>}
    <div className={cn("grid min-h-0 flex-1", hasPanel && !panelExpanded && "xl:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)]")}>
    <div className={cn("flex min-h-0 min-w-0 flex-col", hasPanel && mobilePanel && "hidden xl:flex", hasPanel && panelExpanded && "xl:hidden")}>
      <div role="log" aria-label="Nội dung trao đổi với AI" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {messageCursor && conversationId && <Button variant="outline" disabled={chatLoading || pending} onClick={() => readConversation(conversationId, true, true)}>Xem tin nhắn trước</Button>}

        {messages.map((m, i) => <div key={i} className={cn("w-fit max-w-full rounded-xl p-3 text-sm", m.role === "user" ? "ml-auto bg-primary/10" : "mr-auto bg-muted/60")}><p className="mb-1 text-xs font-medium text-muted-foreground">{m.role === "user" ? "Bạn" : "Trợ lý"}</p>{m.attachments && m.attachments.length > 0 && <AiFileLinks files={m.attachments} onOpen={openDocument} />}<div className="max-w-[72ch] leading-relaxed"><AiMessageText text={m.content || (m.status === "DANG_XU_LY" ? "Đang xử lý…" : "")} /></div>{m.tables && <AiDataTables tables={m.tables} />}{m.resultLists?.map((list, index) => <div key={index} className="mt-3 rounded-lg border p-3"><p className="mb-2 text-xs font-medium">{list.label} · Thứ tự tham chiếu</p><ol className="max-h-40 list-decimal space-y-1 overflow-y-auto pl-5">{list.items.map((label, position) => <li key={position} className="break-words text-sm">{label}</li>)}</ol></div>)}{m.supportTargets && m.supportTargets.length > 0 && <div className="mt-3 space-y-2 rounded-lg border p-3" aria-label="Người và phòng tiếp nhận"><p className="text-sm font-medium">Người/phòng phù hợp</p><ul className="max-h-72 space-y-2 overflow-y-auto">{Array.from(new Map(m.supportTargets.map(target => [`${target.kind}:${target.id}`, target])).values()).map(target => <li key={`${target.kind}:${target.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"><div className="min-w-0 flex-1 basis-48"><p className="break-words font-medium">{target.name} <span className="font-normal text-muted-foreground">· {target.code}</span></p><p className="break-words text-xs text-muted-foreground">{[target.position, target.department].filter(Boolean).join(" · ") || (target.kind === "departments" ? "Phòng ban" : "Nhân viên")}</p>{!target.canReceive && <p className="mt-1 text-xs text-muted-foreground">{target.unavailableReason ?? "Chưa đủ điều kiện tiếp nhận."}</p>}</div><Button type="button" variant="outline" className="min-h-10 shrink-0" aria-label={`Chọn ${target.name} (${target.code})`} disabled={!target.canReceive || pending || uploading || chatLoading || archiving || running || archived || Boolean(draft) || !settings.hasKey || !settings.enabled} onClick={() => chooseSupportTarget(target)}>Chọn</Button></li>)}</ul>{(messageValue?.trim() || attachments.length > 0) && <p className="text-xs text-muted-foreground">Lựa chọn sẽ được thêm vào tin nhắn đang soạn để bạn kiểm tra trước khi gửi.</p>}</div>}{m.contextTruncated && <p className="mt-2 text-xs text-muted-foreground">Lượt này chỉ dùng phần lịch sử gần đây; hãy nhắc lại đối tượng nếu cần.</p>}{m.supportTaskDraft && <Button variant="outline" className="mt-2 min-h-10" disabled={pending || Boolean(draft)} onClick={()=>{setDraft(supportDraft(m.supportTaskDraft!));selectWork(null);setDraftVisible(true);setMobilePanel(true);}}>Mở yêu cầu hỗ trợ</Button>}{m.draft && !m.supportTaskDraft && <p className="mt-2 text-xs text-muted-foreground">Bản nháp chưa lưu.</p>}{(m.status === "LOI" || m.status === "GIAN_DOAN") && <Button variant="outline" className="mt-2 min-h-10" disabled={pending || chatLoading || Boolean(draft) || archived} onClick={() => { const question = messages.find(q => q.requestId === m.requestId && q.role === "user"); if (question) { form.setValue("message", question.content); setFailed(null); form.setFocus("message"); } }}>Dùng lại yêu cầu</Button>}{m.workId && <Button variant="outline" className="mt-2 min-h-10" onClick={async () => { try { const result = await getAiWork({ id: m.workId }); if (result.success) { mergeWorks([result.work]); selectWork(result.work.id); } else setError(result.message); } catch { setError("Chưa tải được công việc."); } }}>Xem công việc đã lập</Button>}{m.href && <Link className="mt-2 inline-flex min-h-10 items-center font-medium text-primary underline underline-offset-4" href={m.href}>Mở hồ sơ</Link>}</div>)}
        {pending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang đọc yêu cầu và tra cứu…</p>}
        <div ref={bottom} />
      </div>
      <Form {...form}><form noValidate onSubmit={submit} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); attachmentPicker.current?.addFiles(Array.from(event.dataTransfer.files)); } }} onPaste={event => { const images = Array.from(event.clipboardData.files).filter(file => file.type.startsWith("image/")); if (images.length) { event.preventDefault(); attachmentPicker.current?.addFiles(images); } }} className="max-h-[50%] shrink-0 space-y-1 overflow-y-auto rounded-xl border bg-background p-2 m-2 sm:m-3 focus-within:ring-1 focus-within:ring-ring">
        {archived && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">Cuộc chat đã lưu trữ.</span><Button type="button" className="min-h-10" disabled={archiving || pending || chatLoading || running || Boolean(draft)} onClick={() => archiveCurrent(false)}>{archiving && <Loader2 className="size-4 animate-spin" />}Khôi phục để chat tiếp</Button></div>}
        {draft && <Button type="button" variant="secondary" className="min-h-10 w-full justify-start" onClick={() => { selectWork(null); setDraftVisible(true); setMobilePanel(true); }}><FilePenLine className="size-4" />{draft.kind === "support-ticket" ? "Yêu cầu hỗ trợ đang mở" : "Bản nháp chờ kiểm tra và lưu"}</Button>}
        <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel className="sr-only" required>Yêu cầu AI</FormLabel><FormControl><Textarea {...field} ref={node => { field.ref(node); messageInput.current = node; }} onKeyDown={event => {
          // Let the input method finish composing before treating Enter as Send.
          if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          event.preventDefault();
          if (!event.repeat) event.currentTarget.form?.requestSubmit();
        }} title="Enter để gửi, Shift+Enter để xuống dòng" aria-required="true" rows={1} maxLength={2000} disabled={documentLocked || uploading || pending || Boolean(draft) || chatLoading || archiving || running || archived} placeholder="Nhập tin nhắn…" className="max-h-36 min-h-12 resize-none border-0 bg-transparent px-2 py-3 text-base md:text-base shadow-none focus-visible:ring-0" /></FormControl><FormMessage /></FormItem>} />
        <AiAttachmentPicker ref={attachmentPicker} files={attachments} onChange={setAttachments} disabled={pending || Boolean(draft) || chatLoading || archiving || running || archived || Boolean(failed)} onBusy={setUploading} toolbar={<>
          <FormField control={form.control} name="job" render={({ field }) => <FormItem className="min-w-0 flex-1 sm:max-w-64"><FormLabel className="sr-only">Tác vụ AI</FormLabel><FormControl><SearchableSelect ref={field.ref} onBlur={field.onBlur} label="Tác vụ AI" value={field.value} onValueChange={field.onChange} className="border-0 bg-transparent px-2 shadow-none [&_span.block]:truncate [&_span.block]:whitespace-nowrap" disabled={pending || running || Boolean(draft)} options={AI_JOBS.map(job => ({ value: job, label: AI_JOB_LABELS[job] }))} /></FormControl><FormMessage /></FormItem>} />
          <Button type="submit" aria-label="Gửi yêu cầu" disabled={documentLocked || uploading || pending || Boolean(draft) || chatLoading || archiving || running || archived} className="ml-auto min-h-10 shrink-0 px-3">{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}<span className="hidden sm:inline">Gửi</span></Button>
        </>} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form></Form>
    </div>
    {hasPanel && <aside aria-label={document ? "Tài liệu cạnh chat" : "Chi tiết công việc AI"} className={cn("min-h-0 min-w-0 flex-col overflow-y-auto border-l bg-muted/20", mobilePanel ? "flex" : "hidden xl:flex")}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-card px-3 py-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><PanelRight className="size-4" />{document ? "Tài liệu" : showDraft ? draft?.kind === "support-ticket" ? "Yêu cầu hỗ trợ" : "Bản nháp hồ sơ" : "Bảng công việc"}</h3><div className="flex gap-1"><Button variant="ghost" size="icon" className="hidden size-10 xl:inline-flex" aria-label={panelExpanded ? "Thu nhỏ bảng" : "Mở rộng bảng"} onClick={() => setPanelExpanded(!panelExpanded)}>{panelExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Button><Button variant="ghost" size="icon" className="size-10" aria-label={document ? "Đóng tài liệu" : "Đóng bảng công việc"} disabled={saving || documentLocked} onClick={() => { if (document) { setDocument(null); setMobilePanel(false); } else { selectWork(null); setDraftVisible(false); } setPanelExpanded(false); }}><X className="size-4" /></Button></div></div>
      {document && conversationId ? <AiOfficePanel key={`${conversationId}:${document.id}`} file={document} chatId={conversationId} onLocked={setDocumentLocked} onSaved={file => { setConversationFiles(old => [...old.filter(f => f.id !== file.id), file]); void readConversation(conversationId, false, true); void loadChats(); }} /> : <div className="space-y-3 p-3">
      {showDraft && draft?.kind === "support-ticket" && <div className="space-y-3 rounded-xl border bg-background p-4"><h4 className="font-medium">Yêu cầu hỗ trợ</h4><AiSupportTicket key={draft.requestId} draft={draft} onCreated={saved} onBusy={setSaving}/><Button variant="outline" disabled={saving} onClick={()=>setDraft(null)}>Đóng yêu cầu</Button></div>}
      {showDraft && draft && draft.kind !== "support-ticket" && <div className="space-y-3 rounded-xl border bg-background p-4"><p className="flex items-center gap-2 font-medium"><FilePenLine className="size-4 text-primary" />{draft.kind === "inventory-transaction" ? "Giao dịch vật tư" : `${draft.row ? "Cập nhật" : "Thêm"} ${draft.kind === "asset" ? "tài sản" : draft.kind === "inventory-item" ? "mặt hàng vật tư" : "vị trí"}`} · Chưa lưu</p>
        <dl className="space-y-2">{draft.changes.map((change, index) => <div key={index} className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{change.label}</dt><dd className="min-w-0 break-words"><span className="line-clamp-2 text-muted-foreground">{change.before}</span><span className="line-clamp-3">→ {change.after}</span></dd></div>)}</dl>
        <div className="flex flex-wrap gap-2"><Button className="min-h-10" onClick={() => setEditing(true)}>Kiểm tra và lưu</Button><Button variant="outline" className="min-h-10" onClick={() => { setDraft(null); setMessages(old => [...old, { role: "assistant", content: "Đã bỏ bản nháp; hồ sơ giữ nguyên." }]); }}>Bỏ bản nháp</Button></div>
      </div>}

      {!showDraft && selectedWork && <AiWorkCard key={selectedWork.id} work={selectedWork} onChange={updated => mergeWorks([updated])} canAdjust={!pending && !draft} onAdjust={text => { form.setValue("message", text); setMobilePanel(false); setPanelExpanded(false); requestAnimationFrame(() => form.setFocus("message")); }} />}
      {!showDraft && !selectedWork && <p role={workError ? "alert" : "status"} className="text-sm text-muted-foreground">{workError || "Đang tải công việc…"}</p>}
      </div>}
    </aside>}
    </div>
    <Dialog open={editing} onOpenChange={value => { if (!saving) setEditing(value); }}><DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-2xl" showCloseButton={!saving} onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (saving) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>Kiểm tra hồ sơ trước khi lưu</DialogTitle><DialogDescription>Bạn có thể sửa nội dung AI đã điền. Bấm Lưu để cập nhật hồ sơ.</DialogDescription></DialogHeader>
      {draft?.kind === "asset" && <AssetForm row={draft.row} categories={draft.categories} initialValues={draft.values} onBusy={setSaving} onCancel={() => setEditing(false)} onSaved={saved} />}
      {draft?.kind === "inventory-item" && <InventoryItemForm row={draft.row ?? undefined} kind={draft.inventoryKind} options={draft.options} recorded={draft.recorded} initialValues={draft.values} onBusy={setSaving} onBlocked={ignoreDraftBlocked} onCancel={() => setEditing(false)} onSaved={row => saved(row.id)} />}
      {draft?.kind === "inventory-transaction" && <InventoryTransactionForm detail={draft.detail} options={draft.options} target={{ operation: draft.values.operation, issueId: draft.values.issueId ?? undefined, reversalId: draft.values.reversalId ?? undefined }} initialValues={draft.values} onBusy={setSaving} onBlocked={ignoreDraftBlocked} onCancel={() => setEditing(false)} onSaved={() => saved(draft.row.id)} />}
      {draft?.kind === "location" && <LocationForm rows={draft.rows} editing={{ row: draft.row ?? undefined, parentId: draft.row?.parent_id ?? draft.values.parentId }} initialValues={draft.values} onBusy={setSaving} onCancel={() => setEditing(false)} onSaved={saved} />}
    </DialogContent></Dialog>
  </section></div>;
  return <DashboardWorkspace assistant={assistant} aiWorks={workBoard}>{workflow}</DashboardWorkspace>;
}
