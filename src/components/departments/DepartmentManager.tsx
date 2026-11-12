"use client";

import { FeatureOverview, FeatureHelp } from "@/components/ui/feature-overview";
import { Users, UserCheck } from "lucide-react";
import { OrganizationChart } from "./OrganizationChart";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CreateDepartmentSchema, type CreateDepartmentInput } from "@/lib/validations/department";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, FolderTree, Pencil, Search, Plus, Trash2 } from "lucide-react";
import { createDepartment, updateDepartment, deleteDepartment } from "@/actions/department";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRequiredHint,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
export interface DepartmentItem {
  id: number;
  ma_phong_ban: string;
  ten_phong_ban: string;
  mo_ta: string | null;
  parent_id: number | null;
  nguoi_phu_trach_id: number | null;
  nguoi_phu_trach: { id: number; ho_ten: string; ma_nhan_su: string; tinh_trang_lam_viec: string } | null;
  danh_sach_nhan_su: Array<{ id: number; ho_ten: string; ma_nhan_su: string; chuc_vu: string | null }>;
  _count: { danh_sach_nhan_su: number; phong_ban_con: number };
}

interface DepartmentManagerProps {
  companyName: string;
  initialDepartments: DepartmentItem[];
  canManage: boolean;
  headCandidates: Array<{ id: number; ho_ten: string; ma_nhan_su: string; tinh_trang_lam_viec: string; phong_ban: { ten_phong_ban: string } | null }>;
}

export function DepartmentManager({
  initialDepartments,
  companyName,
  canManage,
  headCandidates,
}: DepartmentManagerProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<DepartmentItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(initialDepartments.map((department) => department.id)));
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateDepartmentInput>({
    resolver: zodResolver(CreateDepartmentSchema),
    defaultValues: { name: "", code: "", description: "", parentId: null, headEmployeeId: null },
  });

  const totalEmployees = useMemo(
    () => initialDepartments.reduce((total, department) => total + department._count.danh_sach_nhan_su, 0),
    [initialDepartments]
  );
  const rootDepartments = useMemo(
    () => initialDepartments.filter((department) => !department.parent_id),
    [initialDepartments]
  );
  const filteredDepartments = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("vi");
    if (!query) return initialDepartments;
    return initialDepartments.filter((department) =>
      [department.ma_phong_ban, department.ten_phong_ban].some((value) => value.toLocaleLowerCase("vi").includes(query))
    );
  }, [initialDepartments, searchTerm]);

  const openForm = (department: DepartmentItem | null) => {
    setEditingDepartment(department);
    form.reset(department ? { name: department.ten_phong_ban, code: department.ma_phong_ban, description: department.mo_ta ?? "", parentId: department.parent_id, headEmployeeId: department.nguoi_phu_trach_id }
      : { name: "", code: "", description: "", parentId: null, headEmployeeId: null });
    setFormOpen(true);
  };
  const excludedParents = new Set<number>();
  if (editingDepartment) {
    excludedParents.add(editingDepartment.id);
    for (const id of excludedParents)
      for (const d of initialDepartments) if (d.parent_id === id) excludedParents.add(d.id);
  }
  const parentLabel = (department: DepartmentItem) => {
    const names = [department.ten_phong_ban];
    const visited = new Set([department.id]);
    let parent = initialDepartments.find(d => d.id === department.parent_id);
    while (parent && !visited.has(parent.id)) {
      visited.add(parent.id);
      names.unshift(parent.ten_phong_ban);
      parent = initialDepartments.find(d => d.id === parent?.parent_id);
    }
    return names.join(" / ");
  };
  const save = form.handleSubmit(values => {
    startTransition(async () => {
      try {
        const result = editingDepartment
          ? await updateDepartment({ ...values, id: editingDepartment.id })
          : await createDepartment(values);
        if (!result.success) {
          if ("fieldErrors" in result && result.fieldErrors) {
            let focusFirst = true;
            for (const [key, messages] of Object.entries(result.fieldErrors)) {
              if (key in CreateDepartmentSchema.shape && messages?.[0]) {
                form.setError(key as keyof CreateDepartmentInput, { type: "server", message: messages[0] }, { shouldFocus: focusFirst });
                focusFirst = false;
              }
            }
          }
          toast.error(result.message); return;
        }
        toast.success(result.message);
        setFormOpen(false);
        router.refresh();
      } catch { toast.error("Không thể kết nối máy chủ. Vui lòng thử lại."); }
    });
  }, () => toast.error("Vui lòng kiểm tra các trường được đánh dấu trong biểu mẫu."));
  const remove = () => {
    if (!deletingDepartment) return;
    startTransition(async () => {
      try {
        const result = await deleteDepartment(deletingDepartment.id);
        if (!result.success) { toast.error(result.message); return; }
        toast.success(result.message);
        setDeletingDepartment(null);
        router.refresh();
      } catch { toast.error("Không thể kết nối máy chủ. Vui lòng thử lại."); }
    });
  };

  const childrenOf = (id: number) => initialDepartments.filter((item) => item.parent_id === id);
  const branchCount = (department: DepartmentItem, visited = new Set<number>()): number => {
    if (visited.has(department.id)) return 0;
    const next = new Set(visited).add(department.id);
    return department._count.danh_sach_nhan_su + childrenOf(department.id).reduce((sum, child) => sum + branchCount(child, next), 0);
  };
  const branchMatches = (department: DepartmentItem, visited = new Set<number>()): boolean => {
    if (visited.has(department.id)) return false;
    const next = new Set(visited).add(department.id);
    return filteredDepartments.some((item) => item.id === department.id) ||
      childrenOf(department.id).some((child) => branchMatches(child, next));
  };
  const renderBranch = (department: DepartmentItem, visited = new Set<number>()): React.ReactNode => {
    if (visited.has(department.id) || !branchMatches(department)) return null;
    const next = new Set(visited).add(department.id);
    const children = childrenOf(department.id);
    const expanded = !collapsed.has(department.id);
    return (
      <div key={department.id}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 py-3">
          {(children.length > 0 || department.danh_sach_nhan_su.length > 0) && (
            <Button variant="ghost" size="icon" className="size-10 shrink-0"
              aria-label={`${expanded ? "Thu gọn" : "Mở rộng"} ${department.ten_phong_ban}`}
              aria-expanded={expanded}
              onClick={() => setCollapsed((previous) => {
                const updated = new Set(previous);
                if (updated.has(department.id)) updated.delete(department.id);
                else updated.add(department.id);
                return updated;
              })}>
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          )}
          <div className="min-w-0 flex-1 basis-40">
            <p className="break-words font-medium">{department.ten_phong_ban}</p>
            <p className="text-xs text-muted-foreground">{department.ma_phong_ban}</p>
            <p className="text-xs text-muted-foreground">Phụ trách: {department.nguoi_phu_trach?.ho_ten ?? "Chưa phân công"}
              {department.nguoi_phu_trach && department.nguoi_phu_trach.tinh_trang_lam_viec !== "ACTIVE" && " · Cần phân công lại"}
            </p>
          </div>
          <Button variant="ghost" className="h-10" asChild>
            <Link href={`/employees?departmentId=${department.id}`}>
              {branchCount(department)} hồ sơ{children.length ? " trong nhánh" : ""}
            </Link>
          </Button>
          {canManage && <Button variant="ghost" size="icon" className="size-10"
            aria-label={`Sửa phòng ban ${department.ten_phong_ban}`} onClick={() => openForm(department)}>
            <Pencil className="size-4" />
          </Button>}
          {canManage && <Button variant="ghost" size="icon" className="size-10 text-destructive"
            aria-label={`Xóa phòng ban ${department.ten_phong_ban}`} onClick={() => setDeletingDepartment(department)}>
            <Trash2 className="size-4" />
          </Button>}
        </div>
        {expanded && department.danh_sach_nhan_su.length > 0 && (
          <ul aria-label={`Nhân sự trực thuộc ${department.ten_phong_ban}`} className="ml-2 space-y-1 border-l border-border py-2 pl-3 md:ml-4 md:pl-4">
            {department.danh_sach_nhan_su.map((employee) => (
              <li key={employee.id} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                <p className="break-words font-medium">{employee.ho_ten}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {employee.ma_nhan_su} · {employee.chuc_vu || "Chưa có chức vụ"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {expanded && children.length > 0 && (
          <div className="ml-2 border-l border-border pl-2 md:ml-4 md:pl-4">
            {children.map((child) => renderBranch(child, next))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2"><h1 className="flex items-center gap-2 text-2xl font-bold">
          <FolderTree className="size-6 text-primary" />Phòng ban
        </h1>
        <p className="text-sm text-muted-foreground">
          {initialDepartments.length} đơn vị · {totalEmployees} hồ sơ nhân sự
        </p>
        </div>{canManage && <Button onClick={() => openForm(null)}><Plus className="size-4" />Thêm phòng ban</Button>}
      </div>
      <FeatureOverview items={[
        { label: "Đơn vị trong cơ cấu", value: initialDepartments.length, icon: FolderTree },
        { label: "Hồ sơ trực thuộc", value: totalEmployees, icon: Users },
        { label: "Đã gắn người phụ trách", value: initialDepartments.filter((d) => d.nguoi_phu_trach_id !== null).length, icon: UserCheck },
      ]} />
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Tìm phòng ban" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCollapsed(new Set()); }}
          placeholder="Tìm theo tên hoặc mã phòng ban..." className="pl-9" />
      </div>
      <Tabs defaultValue="tree" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><TabsList>
          <TabsTrigger value="tree">Danh sách phòng ban</TabsTrigger>
          <TabsTrigger value="chart">Sơ đồ tổ chức</TabsTrigger>
        </TabsList></div>
        <TabsContent value="tree">
          <Card>
            <CardContent className="px-3 py-1 md:px-5">
              {filteredDepartments.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy phòng ban phù hợp.</p>
                : rootDepartments.map((root) => renderBranch(root))}
            </CardContent>
          </Card>
          <div className="mt-3"><FeatureHelp title="Cách đọc cơ cấu"><p>Mở nhánh để xem nhân sự trực thuộc và bộ phận con. Bấm số hồ sơ để mở danh bạ. Số liệu bao gồm mọi tình trạng làm việc; người phụ trách không tự được cấp quyền.</p></FeatureHelp></div>
        </TabsContent>
        <TabsContent value="chart"><OrganizationChart departments={initialDepartments} companyName={companyName} search={searchTerm} /></TabsContent>
      </Tabs>
      <Dialog open={formOpen} onOpenChange={open => { if (!isPending) setFormOpen(open); }}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Sửa phòng ban" : "Thêm phòng ban"}</DialogTitle>
            <DialogDescription>Cập nhật thông tin và vị trí của phòng ban trong cơ cấu công ty.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={save} noValidate className="space-y-4">
              <FormRequiredHint />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel required>Tên phòng ban</FormLabel><FormControl><Input aria-required="true" {...field} disabled={isPending} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel required>Mã phòng ban</FormLabel><FormControl><Input aria-required="true" {...field} disabled={isPending} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="parentId" render={({ field }) => (
                <FormItem><FormLabel>Phòng ban cấp trên</FormLabel>
                  <FormControl><SearchableSelect label="Phòng ban cấp trên" ref={field.ref} onBlur={field.onBlur} value={field.value ? String(field.value) : "root"} onValueChange={value => field.onChange(value === "root" ? null : Number(value))} disabled={isPending} options={[{ value: "root", label: "Trực thuộc công ty" }, ...initialDepartments.filter(d => !excludedParents.has(d.id)).map(d => ({ value: String(d.id), label: parentLabel(d), keywords: d.ma_phong_ban }))]} /></FormControl>
                  <FormDescription>Không chọn cấp trên nếu đây là đơn vị trực thuộc công ty.</FormDescription><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="headEmployeeId" render={({ field }) => (
                <FormItem><FormLabel>Người phụ trách phòng ban</FormLabel>
                  <FormControl><SearchableSelect label="Người phụ trách phòng ban" ref={field.ref} onBlur={field.onBlur} value={field.value ? String(field.value) : "none"} onValueChange={value => field.onChange(value === "none" ? null : Number(value))} disabled={isPending} searchPlaceholder="Tìm tên, mã hoặc phòng ban…" options={[{ value: "none", label: "Chưa phân công" }, ...headCandidates.filter(p => p.tinh_trang_lam_viec === "ACTIVE" || p.id === editingDepartment?.nguoi_phu_trach_id).map(p => ({ value: String(p.id), label: p.ho_ten, description: `${p.ma_nhan_su} · ${p.phong_ban?.ten_phong_ban ?? "Chưa có phòng"}${p.tinh_trang_lam_viec !== "ACTIVE" ? " · Cần phân công lại" : ""}` }))]} /></FormControl>
                  <FormDescription>Một người có thể phụ trách nhiều phòng. Quyền sử dụng phần mềm được cấp riêng cho tài khoản.</FormDescription><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Mô tả</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={isPending} rows={3} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isPending}>Hủy</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu phòng ban"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deletingDepartment)} onOpenChange={open => { if (!open && !isPending) setDeletingDepartment(null); }}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Xóa phòng ban</DialogTitle><DialogDescription>
            {deletingDepartment && (deletingDepartment._count.phong_ban_con > 0 || deletingDepartment._count.danh_sach_nhan_su > 0)
              ? `Phòng ${deletingDepartment.ten_phong_ban} còn ${deletingDepartment._count.phong_ban_con} đơn vị con và ${deletingDepartment._count.danh_sach_nhan_su} hồ sơ nhân sự. Hãy chuyển các dữ liệu này trước khi xóa.`
              : `Bạn có chắc muốn xóa phòng ban “${deletingDepartment?.ten_phong_ban}”?`}
          </DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={() => setDeletingDepartment(null)}>Hủy</Button>
            <Button variant="destructive" onClick={remove} disabled={isPending || Boolean(deletingDepartment && (deletingDepartment._count.phong_ban_con || deletingDepartment._count.danh_sach_nhan_su))}>{isPending ? "Đang xóa..." : "Xác nhận xóa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
