import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bot } from "lucide-react";
import { getSession, hasPermission } from "@/lib/auth";
import { canAdministerAi } from "@/lib/role-catalog";
import { SettingsAccessDenied, SettingsFrame } from "@/components/settings/SettingsFrame";

export const metadata = { title: "Cài đặt chung | SDG ERP" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAdministerAi(session)) return <SettingsAccessDenied />;
  return <SettingsFrame canViewRoles={hasPermission(session, "ROLES")}>
    <section aria-labelledby="settings-heading" className="space-y-4">
      <div><h2 id="settings-heading" className="text-lg font-semibold">Cấu hình hệ thống</h2><p className="mt-1 text-sm text-muted-foreground">Chọn mục cần quản lý.</p></div>
      <Link href="/settings/ai" className="group flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-ring">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><Bot className="size-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h3 className="font-semibold">Quản trị AI</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Quản lý API key, model và trạng thái kết nối của trợ lý.</p></div>
        <ArrowUpRight className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
      </Link>
    </section>
  </SettingsFrame>;
}
