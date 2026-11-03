"use client";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  dinh_danh: number;
  ma_phong_ban: string;
  ten_phong_ban: string;
  mo_ta: string | null;
  dinh_danh_phong_ban_cha: number | null;
  danh_sach_nhan_su: Array<{ dinh_danh: number; ho_ten: string; ma_nhan_su: string; chuc_vu: string | null }>;
  _count: { danh_sach_nhan_su: number; phong_ban_con: number };
}

interface DepartmentManagerProps {
  companyName: string;
  initialDepartments: DepartmentItem[];
  canManage: boolean;
}

export function DepartmentManager({
  initialDepartments,
  companyName,
  canManage,
}: DepartmentManagerProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<DepartmentItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(initialDepartments.map((department) => department.dinh_danh)));
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateDepartmentInput>({
    resolver: zodResolver(CreateDepartmentSchema),
    defaultValues: { name: "", code: "", description: "", parentId: null },
  });

  const totalEmployees = useMemo(
    () => initialDepartments.reduce((total, department) => total + department._count.danh_sach_nhan_su, 0),
    [initialDepartments]
  );
  const rootDepartments = useMemo(
    () => initialDepartments.filter((department) => !department.dinh_danh_phong_ban_cha),
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
    form.reset(department ? { name: department.ten_phong_ban, code: department.ma_phong_ban, description: department.mo_ta ?? "", parentId: department.dinh_danh_phong_ban_cha }
      : { name: "", code: "", description: "", parentId: null });
    setFormOpen(true);
  };
  const excludedParents = new Set<number>();
  if (editingDepartment) {
    excludedParents.add(editingDepartment.dinh_danh);
    for (const id of excludedParents)
      for (const d of initialDepartments) if (d.dinh_danh_phong_ban_cha === id) excludedParents.add(d.dinh_danh);
  }
  const parentLabel = (department: DepartmentItem) => {
    const names = [department.ten_phong_ban];
    const visited = new Set([department.dinh_danh]);
    let parent = initialDepartments.find(d => d.dinh_danh === department.dinh_danh_phong_ban_cha);
    while (parent && !visited.has(parent.dinh_danh)) {
      visited.add(parent.dinh_danh);
      names.unshift(parent.ten_phong_ban);
      parent = initialDepartments.find(d => d.dinh_danh === parent?.dinh_danh_phong_ban_cha);
    }
    return names.join(" / ");
  };
  const save = form.handleSubmit(values => {
    startTransition(async () => {
      try {
        const result = editingDepartment
          ? await updateDepartment({ ...values, id: editingDepartment.dinh_danh })
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
        const result = await deleteDepartment(deletingDepartment.dinh_danh);
        if (!result.success) { toast.error(result.message); return; }
        toast.success(result.message);
        setDeletingDepartment(null);
        router.refresh();
      } catch { toast.error("Không thể kết nối máy chủ. Vui lòng thử lại."); }
    });
  };

  const childrenOf = (id: number) => initialDepartments.filter((item) => item.dinh_danh_phong_ban_cha === id);
  const branchCount = (department: DepartmentItem, visited = new Set<number>()): number => {
    if (visited.has(department.dinh_danh)) return 0;
    const next = new Set(visited).add(department.dinh_danh);
    return department._count.danh_sach_nhan_su + childrenOf(department.dinh_danh).reduce((sum, child) => sum + branchCount(child, next), 0);
  };
  const branchMatches = (department: DepartmentItem, visited = new Set<number>()): boolean => {
    if (visited.has(department.dinh_danh)) return false;
    const next = new Set(visited).add(department.dinh_danh);
    return filteredDepartments.some((item) => item.dinh_danh === department.dinh_danh) ||
      childrenOf(department.dinh_danh).some((child) => branchMatches(child, next));
  };
  const renderBranch = (department: DepartmentItem, visited = new Set<number>()): React.ReactNode => {
    if (visited.has(department.dinh_danh) || !branchMatches(department)) return null;
    const next = new Set(visited).add(department.dinh_danh);
    const children = childrenOf(department.dinh_danh);
    const expanded = !collapsed.has(department.dinh_danh);
    return (
      <div key={department.dinh_danh}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 py-3">
          {(children.length > 0 || department.danh_sach_nhan_su.length > 0) && (
            <Button variant="ghost" size="icon" className="size-10 shrink-0"
              aria-label={`${expanded ? "Thu gọn" : "Mở rộng"} ${department.ten_phong_ban}`}
              aria-expanded={expanded}
              onClick={() => setCollapsed((previous) => {
                const updated = new Set(previous);
                if (updated.has(department.dinh_danh)) updated.delete(department.dinh_danh);
                else updated.add(department.dinh_danh);
                return updated;
              })}>
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          )}
          <div className="min-w-0 flex-1 basis-40">
            <p className="break-words font-medium">{department.ten_phong_ban}</p>
            <p className="text-xs text-muted-foreground">{department.ma_phong_ban}</p>
          </div>
          <Button variant="ghost" className="h-10" asChild>
            <Link href={`/employees?departmentId=${department.dinh_danh}`}>
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
              <li key={employee.dinh_danh} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
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
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FolderTree className="size-6 text-primary" />Phòng ban
        </h1>
        <p className="text-sm text-muted-foreground">
          {initialDepartments.length} đơn vị · {totalEmployees} hồ sơ nhân sự
        </p>
        {canManage && <Button onClick={() => openForm(null)}><Plus className="size-4" />Thêm phòng ban</Button>}
      </div>
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
          <p className="mt-3 text-xs text-muted-foreground">Mở nhánh để xem nhân sự trực thuộc và bộ phận con. Bấm số hồ sơ để mở danh bạ. Số liệu chưa thể hiện trạng thái đang làm việc.</p>
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
                  <Select value={field.value ? String(field.value) : "root"} onValueChange={value => field.onChange(value === "root" ? null : Number(value))} disabled={isPending}>
                    <FormControl><SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Chọn cấp trên" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="root">Trực thuộc công ty</SelectItem>
                      {initialDepartments.filter(d => !excludedParents.has(d.dinh_danh)).map(d => <SelectItem key={d.dinh_danh} value={String(d.dinh_danh)}>{parentLabel(d)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>Không chọn cấp trên nếu đây là đơn vị trực thuộc công ty.</FormDescription><FormMessage />
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
