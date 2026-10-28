import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmployees } from "@/actions/employee";
import { EmployeeManager } from "@/components/employees/EmployeeManager";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Hồ Sơ & Danh Bạ Nhân Sự | SDG ERP - Sao Đỏ Group",
  description: "Quản lý danh sách nhân sự, phân bổ phòng ban và chức danh tại Sao Đỏ Group",
};

interface PageProps {
  searchParams?: Promise<{
    departmentId?: string;
    roleId?: string;
    search?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const deptFilterId = resolvedParams?.departmentId
    ? parseInt(resolvedParams.departmentId, 10)
    : undefined;

  // Lấy danh sách nhân sự ban đầu
  const res = await getEmployees({
    departmentId: deptFilterId,
  });

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

  const departments = await db.department.findMany({ where: { companyId: session.companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <EmployeeManager
        initialEmployees={res.data || []}
        departments={departments}
        canManage={res.canManage || false}
      />
    </div>
  );
}
