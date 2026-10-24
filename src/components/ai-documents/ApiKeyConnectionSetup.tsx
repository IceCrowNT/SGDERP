import "server-only";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Server component: never serialize credentials into client props or HTML. */
export function ApiKeyConnectionSetup() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasModel = Boolean(process.env.OPENAI_MODEL?.trim());
  const configured = hasKey && hasModel;
  return <section aria-labelledby="api-setup-title" className="space-y-3 rounded-xl border border-border/50 bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="api-setup-title" className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="size-5 text-primary" />Kết nối OpenAI API</h2>
      <Badge variant="outline">{configured ? "Đã có cấu hình server · Chưa xác thực" : "Chưa đủ cấu hình server"}</Badge>
    </div>
    <p className="text-sm text-muted-foreground">Kết nối AI do quản trị viên cấu hình trên máy chủ. Người dùng không cần nhập API key.</p>
    <p role="status" className="text-sm text-muted-foreground">
      {configured ? "Máy chủ đã có API key và model. Cấu hình chưa được xác thực với OpenAI." : "Liên hệ quản trị viên để bổ sung cấu hình AI."}
      {" "}Tính năng gọi AI chưa được triển khai; bạn vẫn có thể nhập dữ liệu và xuất Word theo mẫu.
    </p>
    <p className="text-xs text-muted-foreground">Chi phí API thuộc tài khoản được cấu hình trên máy chủ, thanh toán riêng với gói ChatGPT Pro.</p>
  </section>;
}
