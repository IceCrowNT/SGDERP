"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  FolderTree,
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layers,
  ShieldAlert,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createDepartment, updateDepartment, deleteDepartment } from "@/actions/department";

export interface DepartmentItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  parentId?: number | null;
  parent?: { id: number; code: string; name: string } | null;
  children?: { id: number; code: string; name: string; _count?: { users: number } }[];
  _count: {
    users: number;
    children: number;
  };
}

interface DepartmentManagerProps {
  initialDepartments: DepartmentItem[];
  canManage: boolean;
}

export function DepartmentManager({
  initialDepartments,
  canManage,
}: DepartmentManagerProps) {
  const [departments, setDepartments] = useState<DepartmentItem[]>(initialDepartments);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [isPending, startTransition] = useTransition();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParentId, setFormParentId] = useState<string>("root");

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<DepartmentItem | null>(null);

  // Phân tách đơn vị cấp Cha (Parent) và cấp Con (Child)
  const parentDepartments = departments.filter((d) => !d.parentId);
  const childDepartments = departments.filter((d) => d.parentId);
  const totalEmployeesInDepts = departments.reduce((acc, d) => acc + d._count.users, 0);

  // Lọc theo từ khóa tìm kiếm
  const filteredDepartments = departments.filter((d) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.parent?.name && d.parent.name.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  // Mở Dialog thêm mới
  const handleOpenCreate = (defaultParentId?: number) => {
    setEditingDept(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormParentId(defaultParentId ? String(defaultParentId) : "root");
    setDialogOpen(true);
  };

  // Mở Dialog chỉnh sửa
  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormDescription(dept.description || "");
    setFormParentId(dept.parentId ? String(dept.parentId) : "root");
    setDialogOpen(true);
  };

  // Tự động gợi ý mã code khi người dùng gõ tên phòng ban mới
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingDept) {
      const generatedCode = val
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 25);
      setFormCode(generatedCode);
    }
  };

  // Lưu thông tin Thêm / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Vui lòng nhập đầy đủ Tên và Mã phòng ban.");
      return;
    }

    startTransition(async () => {
      const parentIdNum = formParentId === "root" ? null : parseInt(formParentId, 10);

      if (editingDept) {
        // Cập nhật
        const res = await updateDepartment({
          id: editingDept.id,
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || null,
          parentId: parentIdNum,
        });

        if (res.success && res.data) {
          toast.success(res.message || "Cập nhật phòng ban thành công!");
          setDepartments((prev) =>
            prev.map((d) => (d.id === editingDept.id ? { ...d, ...res.data } : d))
          );
          setDialogOpen(false);
        } else {
          toast.error(res.message || "Không thể cập nhật phòng ban.");
        }
      } else {
        // Tạo mới
        const res = await createDepartment({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || null,
          parentId: parentIdNum,
        });

        if (res.success && res.data) {
          toast.success(res.message || "Tạo phòng ban mới thành công!");
          setDepartments((prev) => [...prev, { ...res.data, _count: { users: 0, children: 0 } }]);
          setDialogOpen(false);
        } else {
          toast.error(res.message || "Không thể tạo phòng ban mới.");
        }
      }
    });
  };

  // Xác nhận xóa phòng ban
  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;

    startTransition(async () => {
      const res = await deleteDepartment(deptToDelete.id);
      if (res.success) {
        toast.success(res.message || "Đã xóa phòng ban thành công!");
        setDepartments((prev) => prev.filter((d) => d.id !== deptToDelete.id));
        setDeleteDialogOpen(false);
      } else {
        toast.error(res.message || "Lỗi khi xóa phòng ban.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderTree className="w-7 h-7 text-primary" />
            Cơ Cấu Tổ Chức & Phòng Ban
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mô hình phân cấp Cây 2 tầng: Quản lý các Khối độc lập, Phòng ban cấp Tập đoàn và Bộ phận trực thuộc.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => handleOpenCreate()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Thêm Phòng Ban Mới
          </Button>
        )}
      </div>

      {/* Thẻ thống kê trực quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Tổng số đơn vị</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-between">
              {departments.length}
              <Layers className="w-5 h-5 text-muted-foreground/60" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Cấp Tập đoàn / Khối</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-between">
              {parentDepartments.length}
              <Building2 className="w-5 h-5 text-primary/60" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Bộ phận trực thuộc</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 flex items-center justify-between">
              {childDepartments.length}
              <GitBranch className="w-5 h-5 text-blue-500/60" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Nhân sự đã phân bổ</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 flex items-center justify-between">
              {totalEmployeesInDepts}
              <Users className="w-5 h-5 text-emerald-500/60" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 2. Toolbar Tìm kiếm & Chế độ xem */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên phòng ban, mã code, đơn vị quản lý..."
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-muted/60 p-1 rounded-lg border border-border/60">
          <button
            onClick={() => setViewMode("tree")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === "tree"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sơ đồ Cây (Tree)
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === "table"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bảng Chi Tiết (Table)
          </button>
        </div>
      </div>

      {/* 3. Hiển thị Dữ liệu */}
      {viewMode === "tree" ? (
        /* CHẾ ĐỘ SƠ ĐỒ CÂY PHÂN CẤP (TREE CARDS) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {parentDepartments
            .filter((p) => {
              if (!searchTerm.trim()) return true;
              const q = searchTerm.toLowerCase();
              const selfMatch = p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
              const children = departments.filter((c) => c.parentId === p.id);
              const childMatch = children.some(
                (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
              );
              return selfMatch || childMatch;
            })
            .map((parent) => {
              const children = departments.filter((c) => c.parentId === parent.id);
              const totalSubUsers =
                parent._count.users + children.reduce((acc, c) => acc + c._count.users, 0);

              return (
                <Card
                  key={parent.id}
                  className="overflow-hidden border border-border/80 shadow-xs hover:border-primary/40 transition-all"
                >
                  {/* Header Khối / Phòng ban Cha */}
                  <div className="bg-gradient-to-r from-muted/50 to-muted/10 p-4 border-b border-border/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground tracking-tight">
                            {parent.name}
                          </span>
                          <Badge variant="outline" className="text-[11px] font-mono font-semibold">
                            {parent.code}
                          </Badge>
                          {parent.code === "QLDA_NDV1" ? (
                            <Badge className="bg-amber-600/15 text-amber-700 hover:bg-amber-600/20 text-[10px] border-amber-300">
                              Khối Độc Lập
                            </Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/15 text-[10px] border-primary/20">
                              Cấp Tập Đoàn
                            </Badge>
                          )}
                        </div>
                        {parent.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{parent.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/employees?departmentId=${parent.id}`}
                          title={`Xem ${totalSubUsers} nhân sự thuộc ${parent.name}`}
                        >
                          <Badge
                            variant="secondary"
                            className="text-xs font-semibold px-2 py-0.5 cursor-pointer hover:bg-primary/15 hover:text-primary transition-colors"
                          >
                            {totalSubUsers} nhân sự &rarr;
                          </Badge>
                        </Link>

                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/employees?departmentId=${parent.id}`}
                                  className="cursor-pointer"
                                >
                                  <Users className="w-4 h-4 mr-2 text-primary" />
                                  Xem nhân sự ({totalSubUsers})
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenCreate(parent.id)}>
                                <Plus className="w-4 h-4 mr-2 text-primary" />
                                Thêm bộ phận con
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(parent)}>
                                <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
                                Chỉnh sửa thông tin
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeptToDelete(parent);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xóa phòng ban
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Danh sách Bộ phận Con trực thuộc */}
                  <CardContent className="p-4 pt-3">
                    {children.length > 0 ? (
                      <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="group flex items-center justify-between p-2.5 pl-6 rounded-lg bg-card hover:bg-muted/40 border border-border/40 transition-all relative"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {child.name}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  [{child.code}]
                                </span>
                              </div>
                              {child.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  {child.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/employees?departmentId=${child.id}`}
                                title={`Xem nhân sự của ${child.name}`}
                              >
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer">
                                  {child._count.users} NV &rarr;
                                </span>
                              </Link>

                              {canManage && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-70 group-hover:opacity-100"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem asChild>
                                      <Link
                                        href={`/employees?departmentId=${child.id}`}
                                        className="cursor-pointer"
                                      >
                                        <Users className="w-3.5 h-3.5 mr-2 text-primary" />
                                        Xem nhân sự ({child._count.users})
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenEdit(child)}>
                                      <Pencil className="w-3.5 h-3.5 mr-2" />
                                      Chỉnh sửa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setDeptToDelete(child);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      Xóa bộ phận
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/60 hover:bg-muted/30 transition-colors">
                        <p>Đơn vị cấp Tập đoàn (Không chia bộ phận con trực thuộc)</p>
                        <Link
                          href={`/employees?departmentId=${parent.id}`}
                          className="inline-flex items-center gap-1.5 text-xs mt-1.5 text-primary hover:underline font-semibold"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Xem {parent._count.users} cán bộ nhân viên công tác trực tiếp &rarr;
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        /* CHẾ ĐỘ BẢNG DỮ LIỆU CHI TIẾT (TABLE VIEW) */
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Mã Code</th>
                  <th className="px-4 py-3">Tên Phòng Ban / Bộ Phận</th>
                  <th className="px-4 py-3">Cấp Phân Bổ</th>
                  <th className="px-4 py-3">Đơn vị quản lý cấp trên</th>
                  <th className="px-4 py-3 text-center">Số Nhân Sự</th>
                  {canManage && <th className="px-4 py-3 text-right">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-primary">
                      {dept.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{dept.name}</div>
                      {dept.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {dept.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {dept.parentId ? (
                        <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">
                          Bộ phận trực thuộc
                        </Badge>
                      ) : dept.code === "QLDA_NDV1" ? (
                        <Badge className="text-[11px] bg-amber-500/15 text-amber-700 border-amber-300">
                          Khối Độc Lập
                        </Badge>
                      ) : (
                        <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20">
                          Cấp Tập Đoàn
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {dept.parent ? (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          {dept.parent.name}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Tập đoàn Sao Đỏ</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      <Link
                        href={`/employees?departmentId=${dept.id}`}
                        className="inline-block px-2.5 py-0.5 rounded-full bg-muted hover:bg-primary/15 hover:text-primary text-xs transition-colors cursor-pointer"
                        title="Xem danh sách nhân sự"
                      >
                        {dept._count.users} NV &rarr;
                      </Link>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(dept)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeptToDelete(dept);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. Dialog Thêm mới / Chỉnh sửa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingDept ? "Chỉnh Sửa Thông Tin Phòng Ban" : "Thêm Phòng Ban / Bộ Phận Mới"}
            </DialogTitle>
            <DialogDescription>
              Hệ thống ràng buộc toàn vẹn theo ID số nguyên. Việc thay đổi tên hoặc điều chuyển phòng
              ban cha sẽ không làm mất dữ liệu công việc và nhân sự.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">
                Tên Phòng Ban / Bộ Phận <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dept-name"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="VD: Phòng Kiểm Toán Nội Bộ, Bộ phận Kỹ thuật..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-code">
                Mã Phòng Ban (Code) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dept-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="VD: KTNB, HCNS_IT..."
                className="font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Mã viết hoa, không dấu, dùng để đối soát danh mục nhanh trên hệ thống.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-parent">Đơn vị / Phòng ban cấp trên (Cây phân cấp)</Label>
              <select
                id="dept-parent"
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}
                className="w-full h-9 px-3 py-1 text-sm bg-transparent border border-input rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-ring dark:bg-input/30"
              >
                <option value="root">-- Là Đơn vị Cấp Tập Đoàn / Khối Độc Lập --</option>
                {parentDepartments
                  .filter((p) => !editingDept || p.id !== editingDept.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Trực thuộc: {p.name} ({p.code})
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Nếu chọn trực thuộc, hệ thống sẽ tự động xếp vào nhóm bộ phận con của phòng ban này.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Mô tả chức năng & nhiệm vụ</Label>
              <Textarea
                id="dept-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mô tả chức năng chính hoặc ghi chú nhiệm vụ của phòng ban..."
                rows={3}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Hủy Bỏ
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {isPending ? "Đang lưu..." : editingDept ? "Cập Nhật" : "Tạo Mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Dialog Xác nhận xóa an toàn */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Xác Nhận Xóa Phòng Ban?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Bạn có chắc chắn muốn xóa đơn vị:{" "}
                <span className="font-bold text-foreground">{deptToDelete?.name}</span>?
              </p>
              {deptToDelete?._count.children ? (
                <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md">
                  ⚠️ Đơn vị này đang có <b>{deptToDelete._count.children} bộ phận con</b> trực thuộc. Hệ
                  thống sẽ từ chối xóa để đảm bảo toàn vẹn dữ liệu.
                </div>
              ) : null}
              {deptToDelete?._count.users ? (
                <div className="p-2.5 bg-amber-500/10 text-amber-700 text-xs rounded-md">
                  ⚠️ Đơn vị này đang có <b>{deptToDelete._count.users} nhân sự</b> công tác. Hãy điều
                  chuyển nhân sự sang phòng khác trước khi xóa.
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                isPending ||
                (deptToDelete ? deptToDelete._count.children > 0 || deptToDelete._count.users > 0 : false)
              }
            >
              {isPending ? "Đang xóa..." : "Xác Nhận Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
