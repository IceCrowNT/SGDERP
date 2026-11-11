import { canManageAccounts } from "@/lib/account-access";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmployees } from "@/actions/employee";
import { getLocationOptions } from "@/actions/location";
import { locationPath } from "@/lib/location-tree";
import { isAvailableWorkLocation } from "@/lib/work-location";
import { EmployeeManager } from "@/components/employees/EmployeeManager";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Hồ Sơ & Danh Bạ Nhân Sự | SDG ERP - Sao Đỏ Group",
  description:
    "Quản lý danh sách nhân sự, phân bổ phòng ban và chức danh tại Sao Đỏ Group",
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
  const res = await getEmployees();

  if (!res.success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-2xl border border-border/80 shadow-xs max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          Không Thể Truy Cập
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">{res.message}</p>
      </div>
    );
  }

  const departments = await db.phong_ban.findMany({
    where: { company_id: session.companyId },
    select: { id: true, ten_phong_ban: true, parent_id: true },
    orderBy: { ten_phong_ban: "asc" },
  });

  const accountAccess = canManageAccounts(session);
  const locationResult = res.canManage ? await getLocationOptions() : null;
  const locationRows = locationResult?.success ? locationResult.rows : [];
  const workLocations = locationRows
    .filter((row) => isAvailableWorkLocation(row.id, locationRows))
    .map((row) => ({ id: row.id, label: locationPath(row.id, locationRows) }));
  const roles = accountAccess
    ? await db.vai_tro.findMany({
        where: { company_id: session.companyId },
        select: { id: true, ten_vai_tro: true },
        orderBy: { ten_vai_tro: "asc" },
      })
    : [];
  const accounts = accountAccess
    ? await db.tai_khoan.findMany({
        where: { company_id: session.companyId },
        select: {
          id: true,
          employee_id: true,
          ten_dang_nhap: true,
          cho_phep_dang_nhap: true,
          danh_sach_vai_tro: {
            select: { vai_tro: { select: { ten_vai_tro: true } } },
          },
        },
        orderBy: { ten_dang_nhap: "asc" },
      })
    : [];
  return (
    <div className="space-y-6">
      <EmployeeManager
        key={`${deptFilterId ?? "all"}:${resolvedParams?.search ?? ""}`}
        initialEmployees={res.data || []}
        initialDepartmentId={deptFilterId}
        initialSearch={resolvedParams?.search ?? ""}
        departments={departments.map((department) => {
          const names = [department.ten_phong_ban];
          const seen = new Set([department.id]);
          let parentId = department.parent_id;
          while (parentId && !seen.has(parentId)) {
            seen.add(parentId);
            const parent = departments.find((item) => item.id === parentId);
            if (!parent) break;
            names.unshift(parent.ten_phong_ban);
            parentId = parent.parent_id;
          }
          return {
            id: department.id,
            name: names.join(" → "),
            shortName: department.ten_phong_ban,
            parentId: department.parent_id,
          };
        })}
        canManage={res.canManage || false}
        accountAccess={accountAccess}
        workLocations={workLocations}
        roles={roles}
        accounts={accounts}
      />
    </div>
  );
}
