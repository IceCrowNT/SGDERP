import Link from "next/link";
import { Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsNavigation } from "./SettingsNavigation";

export function SettingsFrame({ children, canViewRoles }: { children: React.ReactNode; canViewRoles: boolean }) {
  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Settings className="size-6" aria-hidden="true" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Cài đặt chung</h1><p className="mt-1 text-sm text-muted-foreground">Quản lý cấu hình dùng chung của công ty.</p></div>
      </div>
      {canViewRoles && <Button asChild variant="outline" className="min-h-10"><Link href="/roles"><ShieldCheck className="size-4" />Phân quyền vai trò</Link></Button>}
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><SettingsNavigation /><div className="min-w-0">{children}</div></div>
  </div>;
}

export function SettingsAccessDenied() {
  return <div className="mx-auto max-w-xl space-y-4 p-6 md:p-10">
    <ShieldCheck className="size-10 text-muted-foreground" aria-hidden="true" />
    <h1 className="text-xl font-semibold">Chưa có quyền truy cập cài đặt</h1>
    <p className="text-sm text-muted-foreground">Liên hệ người quản lý phân quyền để được cấp quyền phù hợp.</p>
    <Button asChild variant="outline"><Link href="/">Về trang tổng quan</Link></Button>
  </div>;
}
