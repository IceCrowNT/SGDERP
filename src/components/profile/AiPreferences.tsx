"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getMyProfile, saveMyAiPreferences } from "@/actions/profile";
import { AiPreferencesSchema } from "@/lib/ai-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const subscribe = () => () => {};
export function AiPreferences({ initial }: { initial: z.infer<typeof AiPreferencesSchema> }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [saved, setSaved] = useState(initial), [error, setError] = useState("");
  const [pending, start] = useTransition();
  const form = useForm<z.infer<typeof AiPreferencesSchema>>({ resolver: zodResolver(AiPreferencesSchema), defaultValues: initial });
  const instructions = useWatch({ control: form.control, name: "instructions" });
  const submit = form.handleSubmit(values => start(async () => {
    setError("");
    try {
      const result = await saveMyAiPreferences(values);
      if (!result.success) {
        setError(result.message);
        if ("fieldErrors" in result && result.fieldErrors?.instructions) form.setError("instructions", { message: result.fieldErrors.instructions[0] });
        return;
      }
      setSaved(result.preferences); form.reset(result.preferences); toast.success(result.message);
    } catch { setError("Chưa xác nhận được việc lưu. Nội dung vẫn được giữ; đọc lại cài đặt trước khi thử tiếp."); }
  }));
  function reload() {
    start(async () => {
      try {
        const current = (await getMyProfile())?.aiPreferences;
        if (!current) { setError("Không đọc được cài đặt. Hãy đăng nhập lại."); return; }
        setSaved(current); form.setValue("version", current.version); setError("");
        toast.info("Đã đọc cài đặt mới nhất. Nội dung đang nhập được giữ; bấm Lưu để áp dụng hoặc Bỏ thay đổi để lấy nội dung đã lưu.");
      } catch { setError("Chưa đọc được cài đặt. Hãy thử lại."); }
    });
  }
  return <section aria-label="Cài đặt trợ lý AI cá nhân" className="min-w-0 space-y-4 rounded-xl border bg-card p-5">
    <h2 className="flex items-center gap-2 font-semibold"><Bot className="size-5 text-primary" />Cài đặt trợ lý AI</h2>
    <Form {...form}><form noValidate onSubmit={submit} className="space-y-4">
      <FormField control={form.control} name="instructions" render={({ field }) => <FormItem>
        <FormLabel>Bối cảnh và cách AI trả lời</FormLabel>
        <FormDescription>Mô tả công việc của bạn, ngôn ngữ và cách trình bày mong muốn. Chỉ áp dụng cho tài khoản này từ lượt chat tiếp theo; không thay đổi quyền truy cập.</FormDescription>
        <FormControl><Textarea {...field} rows={5} maxLength={2000} disabled={pending || !ready} className="text-base" placeholder="Ví dụ: Tôi phụ trách IT văn phòng. Trả lời ngắn bằng tiếng Việt; khi tìm thiết bị, ưu tiên mã, model, tình trạng và vị trí." /></FormControl>
        <p className="text-right text-xs text-muted-foreground">{instructions.length}/2.000 ký tự</p><FormMessage />
      </FormItem>} />
      <p className="text-xs text-muted-foreground">Để trống và lưu để dùng mặc định. Nội dung này sẽ được gửi cùng yêu cầu đến dịch vụ AI; không nhập mật khẩu hoặc API key. Cài đặt này không tự mở quyền sử dụng AI.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending || !ready} className="min-h-10">{pending && <Loader2 className="size-4 animate-spin" />}Lưu cài đặt AI</Button>
        <Button type="button" variant="outline" disabled={pending || !ready} className="min-h-10" onClick={() => { form.reset(saved); setError(""); }}>Bỏ thay đổi</Button>
        {error && <Button type="button" variant="ghost" disabled={pending || !ready} className="min-h-10" onClick={reload}>Đọc lại cài đặt</Button>}
      </div>
    </form></Form>
  </section>;
}
