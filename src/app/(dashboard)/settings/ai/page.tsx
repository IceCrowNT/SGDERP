import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { getAiSettings } from "@/actions/ai-settings";
import { SettingsAccessDenied, SettingsFrame } from "@/components/settings/SettingsFrame";
import { AiSettings } from "@/components/ai/AiSettings";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Quản trị AI | SDG ERP" };

export default async function AiSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const result = await getAiSettings();
  if (!result.success) return <SettingsAccessDenied />;
  const settings = result.settings;
  const configured = settings.hasKey && Boolean(settings.model);
  return <SettingsFrame canViewRoles={hasPermission(session, "ROLES")}>
    <section aria-labelledby="ai-settings-heading" className="space-y-5">
      <div><h2 id="ai-settings-heading" className="text-xl font-semibold">Quản trị AI</h2><p className="mt-1 text-sm text-muted-foreground">Kết nối dùng cho trợ lý trong phần mềm.</p></div>
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div><h3 className="font-semibold">Kết nối & model</h3><p className="mt-1 text-sm text-muted-foreground">OpenAI</p></div>
          <Badge variant="secondary">{!settings.enabled ? "Tạm dừng" : configured ? "Đã cấu hình" : "Chưa cấu hình"}</Badge>
        </div>
        <div className="p-5"><AiSettings initialSettings={settings} /></div>
      </div>
    </section>
  </SettingsFrame>;
}
