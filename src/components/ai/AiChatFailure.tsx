import { CircleAlert } from "lucide-react";
import { aiChatFeedback } from "@/lib/ai-chat-feedback";

export function AiChatFailure({ message, status }: { message: string; status?: string }) {
  const feedback = aiChatFeedback(message, status);
  return <div className="max-w-[72ch] space-y-2 break-words text-sm leading-relaxed" aria-label="Lý do chưa hoàn tất yêu cầu">
    <p className="flex items-center gap-2 font-medium"><CircleAlert className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />Chưa hoàn tất yêu cầu</p>
    <p>{feedback.reason}</p>
    <p className="text-muted-foreground"><span className="font-medium">Cách xử lý: </span>{feedback.suggestion}</p>
  </div>;
}
