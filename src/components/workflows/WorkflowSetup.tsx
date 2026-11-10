import Link from "next/link";
import { GitBranch, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkflowSetup({ canManageRoles }: { canManageRoles: boolean }) {
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-6">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GitBranch className="size-7" aria-hidden="true" /></div><h1 className="text-2xl font-bold">Quy trình và duyệt công việc</h1><div className="flex items-center gap-2 text-sm font-medium"><LockKeyhole className="size-4" aria-hidden="true" />Chưa có quyền truy cập</div>
      <p className="text-muted-foreground">
        Bạn chưa được cấp quyền sử dụng quy trình.
        {canManageRoles
          ? " Hãy cấp quyền cho vai trò và gán vai trò cho tài khoản tại Vai trò và phân quyền."
          : " Liên hệ người quản lý phân quyền để được cấp quyền phù hợp."}
      </p>
      <div className="flex flex-wrap gap-3">
        {canManageRoles && (
          <Button asChild>
            <Link href="/roles">Vai trò và phân quyền</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/">Về dashboard</Link>
        </Button>
      </div>
    </section>
  );
}
