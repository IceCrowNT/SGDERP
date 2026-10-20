"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Building2,
  Calendar,
  Shield,
  Eye,
  Briefcase,
  Layers,
  Filter,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
} from "@/actions/employee";

export interface EmployeeItem {
  id: number;
  fullName: string;
  employeeCode: string;
  username: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: Date | string | null;
  joinDate?: Date | string | null;
  isActive: boolean;
  departmentId?: number | null;
  department?: {
    id: number;
    code: string;
    name: string;
    parent?: { id: number; code: string; name: string } | null;
  } | null;
  roles: {
    isPrimary: boolean;
    role: { id: number; code: string; name: string };
  }[];
}

export interface DepartmentOption {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
}

export interface RoleOption {
  id: number;
  code: string;
  name: string;
}

interface EmployeeManagerProps {
  initialEmployees: EmployeeItem[];
  departments: DepartmentOption[];
  roles: RoleOption[];
  canManage: boolean;
  initialDepartmentFilter?: number | null;
}

export function EmployeeManager({
  initialEmployees,
  departments,
  roles,
  canManage,
  initialDepartmentFilter,
}: EmployeeManagerProps) {
  const [employees, setEmployees] = useState<EmployeeItem[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    initialDepartmentFilter ? String(initialDepartmentFilter) : "ALL"
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // State Dialogs & Sheet
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPwDialogOpen, setResetPwDialogOpen] = useState(false);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);

  // Form State
  const [formFullName, setFormFullName] = useState("");
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState<string>("none");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formJoinDate, setFormJoinDate] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formRoleIds, setFormRoleIds] = useState<number[]>([]);
  const [formPrimaryRoleId, setFormPrimaryRoleId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Phân chia phòng ban cha và con để hiển thị Dropdown thụt lề
  const parentDepts = useMemo(() => departments.filter((d) => !d.parentId), [departments]);

  // Bộ lọc danh bạ thời gian thực
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Lọc theo từ khóa
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchCode = emp.employeeCode.toLowerCase().includes(q);
        const matchUser = emp.username.toLowerCase().includes(q);
        const matchPhone = emp.phone?.toLowerCase().includes(q);
        const matchPos = emp.position?.toLowerCase().includes(q);
        const matchDept = emp.department?.name.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchUser && !matchPhone && !matchPos && !matchDept) {
          return false;
        }
      }

      // 2. Lọc theo trạng thái
      if (selectedStatus === "ACTIVE" && !emp.isActive) return false;
      if (selectedStatus === "INACTIVE" && emp.isActive) return false;

      // 3. Lọc theo vai trò
      if (selectedRoleId !== "ALL") {
        const rId = parseInt(selectedRoleId, 10);
        if (!emp.roles.some((r) => r.role.id === rId)) return false;
      }

      // 4. Lọc theo phòng ban (Nếu chọn phòng cha, bao quát luôn cả các phòng con)
      if (selectedDeptId !== "ALL") {
        const dId = parseInt(selectedDeptId, 10);
        const childDeptIds = departments.filter((d) => d.parentId === dId).map((d) => d.id);
        const validDeptIds = [dId, ...childDeptIds];
        if (!emp.departmentId || !validDeptIds.includes(emp.departmentId)) return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedDeptId, selectedRoleId, selectedStatus, departments]);

  // Quick stats
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.isActive).length;
  const inactiveCount = totalCount - activeCount;

  // Helpers mở Dialog
  const handleOpenCreate = () => {
    setFormFullName("");
    setFormEmployeeCode("");
    setFormUsername("");
    setFormPassword("123456");
    setFormPosition("");
    setFormDepartmentId("none");
    setFormPhone("");
    setFormEmail("");
    setFormDob("");
    setFormJoinDate("");
    const staffRole = roles.find((r) => r.code === "STAFF") || roles[0];
    setFormRoleIds(staffRole ? [staffRole.id] : []);
    setFormPrimaryRoleId(staffRole ? staffRole.id : null);
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    setSelectedEmployee(emp);
    setFormFullName(emp.fullName);
    setFormEmployeeCode(emp.employeeCode);
    setFormUsername(emp.username);
    setFormPosition(emp.position || "");
    setFormDepartmentId(emp.departmentId ? String(emp.departmentId) : "none");
    setFormPhone(emp.phone || "");
    setFormEmail(emp.email || "");
    setFormDob(emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().slice(0, 10) : "");
    setFormJoinDate(emp.joinDate ? new Date(emp.joinDate).toISOString().slice(0, 10) : "");
    setFormIsActive(emp.isActive);
    const rIds = emp.roles.map((r) => r.role.id);
    const primRole = emp.roles.find((r) => r.isPrimary)?.role.id || rIds[0] || null;
    setFormRoleIds(rIds);
    setFormPrimaryRoleId(primRole);
    setEditDialogOpen(true);
  };

  const handleOpenView = (emp: EmployeeItem) => {
    setSelectedEmployee(emp);
    setViewSheetOpen(true);
  };

  const handleOpenResetPw = (emp: EmployeeItem) => {
    setSelectedEmployee(emp);
    setNewPassword("123456");
    setResetPwDialogOpen(true);
  };

  // Submit tạo mới
  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formEmployeeCode.trim() || !formUsername.trim()) {
      toast.error("Vui lòng điền đầy đủ Họ tên, Mã nhân viên và Username.");
      return;
    }
    if (formRoleIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một vai trò cho nhân sự.");
      return;
    }

    startTransition(async () => {
      const res = await createEmployee({
        fullName: formFullName.trim(),
        employeeCode: formEmployeeCode.trim().toUpperCase(),
        username: formUsername.trim().toLowerCase(),
        password: formPassword,
        position: formPosition.trim() || null,
        departmentId: formDepartmentId === "none" ? null : parseInt(formDepartmentId, 10),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        dateOfBirth: formDob || null,
        joinDate: formJoinDate || null,
        roleIds: formRoleIds,
        primaryRoleId: formPrimaryRoleId || formRoleIds[0],
      });

      if (res.success && res.data) {
        toast.success(res.message || "Thêm nhân sự mới thành công!");
        // Re-construct state
        const assignedDept = departments.find((d) => d.id === parseInt(formDepartmentId, 10));
        const assignedRoles = roles
          .filter((r) => formRoleIds.includes(r.id))
          .map((r) => ({
            isPrimary: r.id === (formPrimaryRoleId || formRoleIds[0]),
            role: r,
          }));

        const newEmpItem: EmployeeItem = {
          ...res.data,
          department: assignedDept
            ? {
                ...assignedDept,
                parent: departments.find((p) => p.id === assignedDept.parentId) || null,
              }
            : null,
          roles: assignedRoles,
        };

        setEmployees((prev) => [newEmpItem, ...prev]);
        setCreateDialogOpen(false);
      } else {
        toast.error(res.message || "Lỗi khi thêm mới nhân sự.");
      }
    });
  };

  // Submit cập nhật
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    startTransition(async () => {
      const res = await updateEmployee({
        id: selectedEmployee.id,
        fullName: formFullName.trim(),
        employeeCode: formEmployeeCode.trim().toUpperCase(),
        position: formPosition.trim() || null,
        departmentId: formDepartmentId === "none" ? null : parseInt(formDepartmentId, 10),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        dateOfBirth: formDob || null,
        joinDate: formJoinDate || null,
        isActive: formIsActive,
        roleIds: formRoleIds,
        primaryRoleId: formPrimaryRoleId || formRoleIds[0],
      });

      if (res.success && res.data) {
        toast.success(res.message || "Cập nhật hồ sơ thành công!");
        const assignedDept = departments.find((d) => d.id === parseInt(formDepartmentId, 10));
        const assignedRoles = roles
          .filter((r) => formRoleIds.includes(r.id))
          .map((r) => ({
            isPrimary: r.id === (formPrimaryRoleId || formRoleIds[0]),
            role: r,
          }));

        setEmployees((prev) =>
          prev.map((e) =>
            e.id === selectedEmployee.id
              ? {
                  ...e,
                  ...res.data,
                  department: assignedDept
                    ? {
                        ...assignedDept,
                        parent: departments.find((p) => p.id === assignedDept.parentId) || null,
                      }
                    : null,
                  roles: assignedRoles,
                }
              : e
          )
        );
        setEditDialogOpen(false);
      } else {
        toast.error(res.message || "Lỗi khi cập nhật hồ sơ.");
      }
    });
  };

  // Submit đổi mật khẩu
  const handleResetPassword = () => {
    if (!selectedEmployee || !newPassword.trim()) return;

    startTransition(async () => {
      const res = await resetEmployeePassword({
        userId: selectedEmployee.id,
        newPassword: newPassword.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setResetPwDialogOpen(false);
      } else {
        toast.error(res.message);
      }
    });
  };

  // Toggle trạng thái hoạt động
  const handleToggleStatus = (emp: EmployeeItem) => {
    startTransition(async () => {
      const res = await toggleEmployeeStatus(emp.id);
      if (res.success) {
        toast.success(res.message);
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, isActive: res.isActive ?? !e.isActive } : e))
        );
      } else {
        toast.error(res.message);
      }
    });
  };

  // Helper lấy màu huy hiệu vai trò
  const getRoleBadge = (roleCode: string) => {
    switch (roleCode) {
      case "ADMIN":
        return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Tối Cao</Badge>;
      case "IT_ADMIN":
        return <Badge className="bg-blue-600/15 text-blue-700 border-blue-300 text-[10px]">IT Quản Trị</Badge>;
      case "HR_MANAGER":
        return <Badge className="bg-purple-600/15 text-purple-700 border-purple-300 text-[10px]">Trưởng HCNS</Badge>;
      case "HR_STAFF":
        return <Badge className="bg-indigo-600/15 text-indigo-700 border-indigo-300 text-[10px]">HCNS</Badge>;
      case "DEPT_HEAD":
        return <Badge className="bg-amber-600/15 text-amber-700 border-amber-300 text-[10px]">Trưởng Đơn Vị</Badge>;
      case "ACCOUNTANT":
        return <Badge className="bg-emerald-600/15 text-emerald-700 border-emerald-300 text-[10px]">Kế Toán</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Nhân Viên</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Tiêu đề & Thống kê */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" />
            Hồ Sơ & Danh Bạ Cán Bộ Nhân Viên
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản trị dữ liệu nhân sự thực tế Tập đoàn Sao Đỏ, danh bạ liên hệ và phân quyền tài khoản.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Thêm Nhân Viên Mới
          </Button>
        )}
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border/70">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Tổng số nhân sự</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-between">
              {totalCount}
              <Users className="w-5 h-5 text-muted-foreground/60" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Đang làm việc</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 flex items-center justify-between">
              {activeCount}
              <CheckCircle2 className="w-5 h-5 text-emerald-500/60" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Đã nghỉ việc / Khóa</CardDescription>
            <CardTitle className="text-2xl font-bold text-muted-foreground flex items-center justify-between">
              {inactiveCount}
              <XCircle className="w-5 h-5 text-muted-foreground/50" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs border-border/70">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Kết quả lọc hiện tại</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-between">
              {filteredEmployees.length}
              <Filter className="w-5 h-5 text-primary/60" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 2. Thanh tìm kiếm và bộ lọc nâng cao */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-xs">
        {/* Ô tìm kiếm */}
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên, mã NV (SDG-xxx), username, SĐT..."
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>

        {/* Lọc theo Phòng ban phân cấp */}
        <div className="md:col-span-3">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-ring truncate"
          >
            <option value="ALL">-- Tất cả Phòng Ban / Khối --</option>
            {parentDepts.map((parent) => {
              const children = departments.filter((d) => d.parentId === parent.id);
              return (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>{parent.name} (Tất cả)</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      &nbsp;&nbsp;↳ {child.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Lọc theo Vai trò */}
        <div className="md:col-span-2">
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">-- Vai Trò --</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Trạng thái */}
        <div className="md:col-span-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang làm việc</option>
            <option value="INACTIVE">Đã nghỉ việc / Khóa</option>
          </select>
        </div>
      </div>

      {/* 3. Bảng Danh Bạ Nhân Sự (Data Grid) */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Nhân Sự & Định Danh</th>
                <th className="px-4 py-3">Chức Vụ & Vị Trí</th>
                <th className="px-4 py-3">Phòng Ban Công Tác</th>
                <th className="px-4 py-3">Liên Hệ</th>
                <th className="px-4 py-3">Vai Trò Hệ Thống</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const initials = emp.fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();

                  const primaryRole = emp.roles.find((r) => r.isPrimary)?.role || emp.roles[0]?.role;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        !emp.isActive ? "opacity-60 bg-muted/15" : ""
                      }`}
                    >
                      {/* Cột 1: Định danh */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/70 shrink-0 bg-primary/10 text-primary font-bold text-xs">
                            <AvatarFallback>{initials || "SDG"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {emp.fullName}
                              {emp.username === "admin" && (
                                <Badge className="bg-primary/10 text-primary text-[10px] px-1 py-0">
                                  Master
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                              <span className="font-bold text-primary">{emp.employeeCode}</span>
                              <span>•</span>
                              <span>@{emp.username}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Chức vụ */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground text-xs">
                          {emp.position || "Cán bộ nhân viên"}
                        </div>
                      </td>

                      {/* Cột 3: Phòng ban công tác */}
                      <td className="px-4 py-3">
                        {emp.department ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-xs text-foreground flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {emp.department.name}
                            </div>
                            {emp.department.parent && (
                              <div className="text-[11px] text-muted-foreground pl-4">
                                ↳ Thuộc: {emp.department.parent.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Chưa gắn phòng ban</span>
                        )}
                      </td>

                      {/* Cột 4: Liên hệ */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs">
                          {emp.phone ? (
                            <a
                              href={`tel:${emp.phone}`}
                              className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              {emp.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 italic text-[11px]">Chưa có SĐT</span>
                          )}
                          {emp.email && (
                            <a
                              href={`mailto:${emp.email}`}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px]"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{emp.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Cột 5: Vai trò */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {primaryRole ? getRoleBadge(primaryRole.code) : <Badge variant="outline">--</Badge>}
                          {emp.roles.length > 1 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">
                              +{emp.roles.length - 1}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="px-4 py-3 text-center">
                        {emp.isActive ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300 text-[11px]">
                            Đang làm việc
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground text-[11px]">
                            Nghỉ việc
                          </Badge>
                        )}
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleOpenView(emp)}>
                              <Eye className="w-4 h-4 mr-2 text-primary" />
                              Xem chi tiết hồ sơ
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem onClick={() => handleOpenEdit(emp)}>
                                  <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
                                  Chỉnh sửa & Điều chuyển
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenResetPw(emp)}>
                                  <KeyRound className="w-4 h-4 mr-2 text-amber-600" />
                                  Đặt lại mật khẩu
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(emp)}
                                  className={emp.isActive ? "text-destructive" : "text-emerald-600"}
                                >
                                  {emp.isActive ? (
                                    <>
                                      <UserX className="w-4 h-4 mr-2" />
                                      Khóa tài khoản
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Kích hoạt lại
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    Không tìm thấy cán bộ nhân sự phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Sheet Xem chi tiết hồ sơ cá nhân */}
      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedEmployee && (
            <div className="space-y-6 pt-4">
              <SheetHeader className="text-left pb-4 border-b border-border/70">
                <div className="flex items-center gap-3.5">
                  <Avatar className="h-14 w-14 border-2 border-primary/20 bg-primary/10 text-primary font-bold text-lg">
                    <AvatarFallback>
                      {selectedEmployee.fullName
                        .split(" ")
                        .slice(-2)
                        .map((w) => w[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg font-bold text-foreground">
                      {selectedEmployee.fullName}
                    </SheetTitle>
                    <SheetDescription className="font-mono text-xs text-primary font-bold">
                      {selectedEmployee.employeeCode} • @{selectedEmployee.username}
                    </SheetDescription>
                    <div className="mt-1">
                      {selectedEmployee.isActive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">Đang làm việc</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Đã nghỉ việc</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Thông tin công tác */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Thông Tin Công Tác
                </h4>
                <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border/60 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Chức vụ / Vị trí:</span>
                    <span className="font-semibold text-foreground">
                      {selectedEmployee.position || "Cán bộ nhân viên"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Đơn vị công tác:</span>
                    <span className="font-semibold text-foreground text-right">
                      {selectedEmployee.department?.name || "Chưa gắn"}
                    </span>
                  </div>
                  {selectedEmployee.department?.parent && (
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Trực thuộc Khối:</span>
                      <span className="font-semibold text-foreground text-right">
                        {selectedEmployee.department.parent.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Ngày vào làm:</span>
                    <span className="font-semibold text-foreground">
                      {selectedEmployee.joinDate
                        ? new Date(selectedEmployee.joinDate).toLocaleDateString("vi-VN")
                        : "Chưa ghi nhận"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ & cá nhân */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Thông Tin Cá Nhân & Liên Hệ
                </h4>
                <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border/60 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Số điện thoại:</span>
                    <span className="font-semibold text-foreground font-mono">
                      {selectedEmployee.phone || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-semibold text-foreground">
                      {selectedEmployee.email || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Ngày sinh:</span>
                    <span className="font-semibold text-foreground">
                      {selectedEmployee.dateOfBirth
                        ? new Date(selectedEmployee.dateOfBirth).toLocaleDateString("vi-VN")
                        : "Chưa ghi nhận"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vai trò & Phân quyền */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Vai Trò & Quyền Hạn
                </h4>
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-1.5">
                  {selectedEmployee.roles.map((r) => (
                    <div key={r.role.id} className="flex items-center justify-between text-xs py-1">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        {r.role.name} ({r.role.code})
                      </span>
                      {r.isPrimary && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Vai trò chính
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. Dialog Thêm mới Nhân Sự */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Thêm Mới Cán Bộ Nhân Viên
            </DialogTitle>
            <DialogDescription>
              Tạo hồ sơ và tài khoản nhân sự mới trong hệ thống Tập đoàn Sao Đỏ.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">
                  Họ và tên <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-name"
                  value={formFullName}
                  onChange={(e) => {
                    setFormFullName(e.target.value);
                    if (!formUsername) {
                      // Gợi ý username từ tên
                      const words = e.target.value.trim().toLowerCase().split(" ");
                      if (words.length > 0) {
                        const last = words[words.length - 1];
                        const initials = words.slice(0, -1).map((w) => w[0]).join("");
                        setFormUsername(
                          `${last}${initials}`
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/[^a-z0-9]/g, "")
                        );
                      }
                    }
                  }}
                  placeholder="VD: Nguyễn Văn An"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-code">
                  Mã nhân sự <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-code"
                  value={formEmployeeCode}
                  onChange={(e) => setFormEmployeeCode(e.target.value.toUpperCase())}
                  placeholder="VD: SDG-075"
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-user">
                  Tên tài khoản (1Office / Username) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-user"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                  placeholder="VD: annv"
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-pass">Mật khẩu khởi tạo</Label>
                <Input
                  id="create-pass"
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Mặc định: 123456"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-pos">Chức vụ / Vị trí</Label>
                <Input
                  id="create-pos"
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="VD: Chuyên viên Kinh doanh, Kỹ sư..."
                />
              </div>

              {/* Chọn phòng ban (ràng buộc qua ID) */}
              <div className="space-y-1.5">
                <Label htmlFor="create-dept">
                  Đơn vị / Phòng ban công tác <span className="text-destructive">*</span>
                </Label>
                <select
                  id="create-dept"
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-ring truncate"
                  required
                >
                  <option value="none">-- Chọn phòng ban / bộ phận --</option>
                  {parentDepts.map((parent) => {
                    const children = departments.filter((d) => d.parentId === parent.id);
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>{parent.name} (Cấp Cha)</option>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            &nbsp;&nbsp;↳ {child.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-phone">Số điện thoại</Label>
                <Input
                  id="create-phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0912 345 678"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email">Địa chỉ Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="an.nv@saodogroup.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-dob">Ngày sinh</Label>
                <Input
                  id="create-dob"
                  type="date"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-join">Ngày bắt đầu làm việc</Label>
                <Input
                  id="create-join"
                  type="date"
                  value={formJoinDate}
                  onChange={(e) => setFormJoinDate(e.target.value)}
                />
              </div>
            </div>

            {/* Chọn vai trò */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label>Nhóm vai trò & phân quyền (Role RBAC)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const isChecked = formRoleIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary/10 border-primary text-foreground font-semibold"
                          : "bg-muted/20 border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormRoleIds((prev) => [...prev, r.id]);
                            if (!formPrimaryRoleId) setFormPrimaryRoleId(r.id);
                          } else {
                            const newRoles = formRoleIds.filter((id) => id !== r.id);
                            setFormRoleIds(newRoles);
                            if (formPrimaryRoleId === r.id) setFormPrimaryRoleId(newRoles[0] || null);
                          }
                        }}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                {isPending ? "Đang lưu..." : "Lưu Nhân Sự"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog Chỉnh sửa & Điều chuyển phòng ban */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Chỉnh Sửa Hồ Sơ & Điều Chuyển Phòng Ban
            </DialogTitle>
            <DialogDescription>
              Thay đổi thông tin hồ sơ hoặc điều chuyển sang đơn vị mới. Dữ liệu công việc cũ liên kết
              theo ID số nguyên sẽ được bảo toàn nguyên vẹn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Họ và tên</Label>
                <Input
                  id="edit-name"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Mã nhân sự</Label>
                <Input
                  id="edit-code"
                  value={formEmployeeCode}
                  onChange={(e) => setFormEmployeeCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-pos">Chức vụ / Vị trí</Label>
                <Input
                  id="edit-pos"
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                />
              </div>

              {/* Điều chuyển phòng ban */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-dept" className="text-primary font-bold">
                  Phòng ban công tác (Chọn để Điều chuyển)
                </Label>
                <select
                  id="edit-dept"
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-primary/50 rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-ring font-medium truncate"
                >
                  <option value="none">-- Chưa gắn phòng ban --</option>
                  {parentDepts.map((parent) => {
                    const children = departments.filter((d) => d.parentId === parent.id);
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>{parent.name} (Cấp Cha)</option>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            &nbsp;&nbsp;↳ {child.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Số điện thoại</Label>
                <Input
                  id="edit-phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-dob">Ngày sinh</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-join">Ngày vào làm</Label>
                <Input
                  id="edit-join"
                  type="date"
                  value={formJoinDate}
                  onChange={(e) => setFormJoinDate(e.target.value)}
                />
              </div>
            </div>

            {/* Trạng thái hoạt động */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/60">
              <input
                id="edit-status"
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="edit-status" className="cursor-pointer text-xs font-semibold">
                Tài khoản đang hoạt động (Bỏ chọn nếu nhân sự đã thôi việc / khóa tài khoản)
              </Label>
            </div>

            {/* Chọn vai trò */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label>Vai trò & Quyền hạn</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const isChecked = formRoleIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary/10 border-primary text-foreground font-semibold"
                          : "bg-muted/20 border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormRoleIds((prev) => [...prev, r.id]);
                            if (!formPrimaryRoleId) setFormPrimaryRoleId(r.id);
                          } else {
                            const newRoles = formRoleIds.filter((id) => id !== r.id);
                            setFormRoleIds(newRoles);
                            if (formPrimaryRoleId === r.id) setFormPrimaryRoleId(newRoles[0] || null);
                          }
                        }}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                {isPending ? "Đang lưu..." : "Cập Nhật Hồ Sơ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Dialog Đặt lại mật khẩu */}
      <Dialog open={resetPwDialogOpen} onOpenChange={setResetPwDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Đặt Lại Mật Khẩu
            </DialogTitle>
            <DialogDescription>
              Cấp mật khẩu mới cho tài khoản:{" "}
              <b>{selectedEmployee?.fullName}</b> (@{selectedEmployee?.username}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="new-pw">Mật khẩu mới (Tối thiểu 6 ký tự)</Label>
            <Input
              id="new-pw"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="VD: 123456"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Mật khẩu sẽ được băm bằng bcryptjs an toàn trước khi lưu vào cơ sở dữ liệu.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setResetPwDialogOpen(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isPending || newPassword.length < 6}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isPending ? "Đang đổi..." : "Xác Nhận Đổi Mật Khẩu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
