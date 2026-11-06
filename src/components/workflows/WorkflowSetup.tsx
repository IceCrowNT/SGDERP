import Link from "next/link";
import { Button } from "@/components/ui/button";

export function WorkflowSetup({ canManageRoles }: { canManageRoles: boolean }) {
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-bold">Quy trình và duyệt công việc</h1>
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
