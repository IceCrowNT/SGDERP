import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { getAiConnections } from "@/actions/ai-settings";
import { SettingsAccessDenied, SettingsFrame } from "@/components/settings/SettingsFrame";
import { AiGovernance } from "@/components/ai/AiGovernance";
import { getAiGovernance } from "@/actions/ai-governance";

export const metadata = { title: "Quản trị AI | SDG ERP" };

export default async function AiSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const result = await getAiGovernance();
  if (!result.success) return <SettingsAccessDenied />;
  const connections = result.permissions.manage ? await getAiConnections() : null;
  return <SettingsFrame canViewRoles={hasPermission(session, "ROLES")}>
    <section aria-labelledby="ai-settings-heading" className="space-y-5">
      <div><h2 id="ai-settings-heading" className="text-xl font-semibold">Quản trị AI</h2><p className="mt-1 text-sm text-muted-foreground">Kết nối dùng cho trợ lý trong phần mềm.</p></div>
      <AiGovernance initial={result} initialConnections={connections?.success ? connections : null} />
    </section>
  </SettingsFrame>;
}
