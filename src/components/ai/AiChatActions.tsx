"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { renameAiChat } from "@/actions/ai-chat";
import { RenameChatSchema, type ChatSummary } from "@/lib/ai-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AiChatActions({ chat, disabled, onArchive, onRenamed, onRefresh, label }: {
  chat: Pick<ChatSummary, "id" | "title" | "archived"> & { updatedAt?: string };
  disabled: boolean; onArchive: () => void; onRenamed: (id: number, title: string) => void; onRefresh?: () => void; label?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  const form = useForm<z.infer<typeof RenameChatSchema>>({ resolver: zodResolver(RenameChatSchema), defaultValues: { id: chat.id, title: chat.title, expectedTitle: chat.title } });
  const saving = form.formState.isSubmitting;
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button ref={trigger} type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label={label ?? `Thao tác: ${chat.title}`} disabled={disabled}><MoreHorizontal aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-72">
        {chat.updatedAt && <><DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Cập nhật {new Date(chat.updatedAt).toLocaleString("vi-VN")}</DropdownMenuLabel><DropdownMenuSeparator /></>}
        <DropdownMenuItem className="min-h-10" onSelect={() => { form.reset({ id: chat.id, title: chat.title, expectedTitle: chat.title }); setError(""); setOpen(true); }}><Pencil aria-hidden="true" />Đổi tên</DropdownMenuItem>
        <DropdownMenuItem className="min-h-10" onSelect={onArchive}>{chat.archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}{chat.archived ? "Khôi phục chat" : "Lưu trữ chat"}</DropdownMenuItem>
        {onRefresh && <DropdownMenuItem className="min-h-10" onSelect={onRefresh}><RefreshCw aria-hidden="true" />Tải lại hội thoại</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}><DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-md" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}><DialogHeader><DialogTitle>Đổi tên cuộc trò chuyện</DialogTitle><DialogDescription>Đặt tên ngắn để dễ tìm lại trong lịch sử.</DialogDescription></DialogHeader>
      <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(async values => {
        setError("");
        try { const result = await renameAiChat(values); if (!result.success) { setError(result.message); if ("fieldErrors" in result && result.fieldErrors?.title?.[0]) form.setError("title", { message: result.fieldErrors.title[0] }); return; }
          onRenamed(chat.id, result.title); setOpen(false); toast.success("Đã đổi tên cuộc trò chuyện.");
        } catch { setError("Chưa lưu được tên. Nội dung đã nhập vẫn được giữ; hãy thử lại."); }
      })}>
        <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel required>Tên cuộc trò chuyện</FormLabel><FormControl><Input {...field} autoFocus aria-required="true" maxLength={80} disabled={saving} /></FormControl><FormMessage /></FormItem>} />
        <FormRequiredHint />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu tên"}</Button></div>
      </form></Form>
    </DialogContent></Dialog>
  </>;
}
