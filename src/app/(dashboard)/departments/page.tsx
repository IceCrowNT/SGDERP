import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDepartments } from "@/actions/department";
import { DepartmentManager } from "@/components/departments/DepartmentManager";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Cơ Cấu Tổ Chức & Phòng Ban | SDG ERP - Sao Đỏ Group",
  description: "Quản lý cơ cấu phòng ban và bộ phận phân cấp theo cây của Tập đoàn Sao Đỏ",
};

export default async function DepartmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const res = await getDepartments();

  if (!res.success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-2xl border border-border/80 shadow-xs max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Không Thể Truy Cập</h2>
        <p className="text-sm text-muted-foreground mt-1.5">{res.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DepartmentManager
        initialDepartments={res.data}
        companyName={res.companyName}
        comparison={res.comparison}
        canManage={res.canManage}
      />
    </div>
  );
}
