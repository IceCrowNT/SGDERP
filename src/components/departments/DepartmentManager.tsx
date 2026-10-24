"use client";

import { OrganizationChart } from "./OrganizationChart";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, FolderTree, Pencil, Search } from "lucide-react";
import { updateDepartment, type DepartmentSyncStatus } from "@/actions/department";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DepartmentItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  parent: { id: number; code: string; name: string; externalId: string | null } | null;
  children: Array<{
    id: number;
    code: string;
    name: string;
    externalId: string | null;
    _count: { users: number };
  }>;
  employees: Array<{ id: number; fullName: string; employeeCode: string; position: string | null }>;
  _count: { users: number; children: number };
  source: {
    system: string | null;
    id: string | null;
    parentId: string | null;
    name: string | null;
    path: string | null;
    level: number | null;
    supervisorName: string | null;
    snapshotAt: string | null;
  };
  syncStatus: DepartmentSyncStatus;
}

interface ComparisonSummary {
  system: string;
  sourceDepartmentRecords: number;
  matched: number;
  issues: number;
  snapshotAt: string | null;
}

interface DepartmentManagerProps {
  companyName: string;
  initialDepartments: DepartmentItem[];
  comparison: ComparisonSummary;
  canManage: boolean;
}

const metadataSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã đơn vị cần ít nhất 2 ký tự")
    .max(50, "Mã đơn vị tối đa 50 ký tự")
    .regex(/^[A-Z0-9_-]+$/, "Chỉ dùng chữ in hoa, số, gạch dưới hoặc gạch nối"),
  description: z.string().trim().max(1000, "Mô tả tối đa 1.000 ký tự"),
});

type MetadataForm = z.infer<typeof metadataSchema>;

const statusContent: Record<DepartmentSyncStatus, { label: string; detail: string }> = {
  MATCHED: { label: "Khớp bản đã lưu", detail: "Tên và đơn vị cấp trên đang khớp snapshot nguồn." },
  NAME_MISMATCH: { label: "Lệch tên", detail: "Tên ERP khác tên trong snapshot 1Office." },
  PARENT_MISMATCH: { label: "Lệch cấp trên", detail: "Quan hệ cha/con ERP khác snapshot 1Office." },
  UNLINKED: { label: "Chưa liên kết", detail: "Đơn vị chưa có external ID của 1Office." },
};

function SyncBadge({ status }: { status: DepartmentSyncStatus }) {
  const matched = status === "MATCHED";
  return (
    <Badge
      variant={matched ? "secondary" : "outline"}
      className={matched ? "gap-1 text-xs" : "gap-1 border-destructive/40 text-destructive text-xs"}
    >
      
      {statusContent[status].label}
    </Badge>
  );
}

function formatSnapshot(value: string | null) {
  if (!value) return "Chưa có snapshot";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(value)
  );
}

export function DepartmentManager({
  initialDepartments,
  companyName,
  comparison,
  canManage,
}: DepartmentManagerProps) {
  const router = useRouter();
  const [showComparison, setShowComparison] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(initialDepartments.map((department) => department.id)));
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<MetadataForm>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { code: "", description: "" },
  });

  const totalEmployees = useMemo(
    () => initialDepartments.reduce((total, department) => total + department._count.users, 0),
    [initialDepartments]
  );
  const rootDepartments = useMemo(
    () => initialDepartments.filter((department) => !department.parentId),
    [initialDepartments]
  );
  const filteredDepartments = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("vi");
    if (!query) return initialDepartments;
    return initialDepartments.filter((department) =>
      [department.code, department.name].some((value) => value.toLocaleLowerCase("vi").includes(query))
    );
  }, [initialDepartments, searchTerm]);

  const openMetadata = (department: DepartmentItem) => {
    setEditingDepartment(department);
    form.reset({ code: department.code, description: department.description ?? "" });
  };

  const saveMetadata = form.handleSubmit((values) => {
    if (!editingDepartment) return;
    startTransition(async () => {
      const result = await updateDepartment({
        id: editingDepartment.id,
        code: values.code.toUpperCase(),
        description: values.description || null,
        name: editingDepartment.name,
        parentId: editingDepartment.parentId,
      });
      if (!result.success) {
        toast.error(result.message ?? "Không thể cập nhật metadata đơn vị.");
        return;
      }
      toast.success(result.message);
      setEditingDepartment(null);
      router.refresh();
    });
  });

  const childrenOf = (id: number) => initialDepartments.filter((item) => item.parentId === id);
  const branchCount = (department: DepartmentItem, visited = new Set<number>()): number => {
    if (visited.has(department.id)) return 0;
    const next = new Set(visited).add(department.id);
    return department._count.users + childrenOf(department.id).reduce((sum, child) => sum + branchCount(child, next), 0);
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
          {(children.length > 0 || department.employees.length > 0) && (
            <Button variant="ghost" size="icon" className="size-10 shrink-0"
              aria-label={`${expanded ? "Thu gọn" : "Mở rộng"} ${department.name}`}
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
            <p className="break-words font-medium">{department.name}</p>
            <p className="text-xs text-muted-foreground">{department.code}</p>
          </div>
          <Button variant="ghost" className="h-10" asChild>
            <Link href={`/employees?departmentId=${department.id}`}>
              {branchCount(department)} hồ sơ{children.length ? " trong nhánh" : ""}
            </Link>
          </Button>
          {canManage && <Button variant="ghost" size="icon" className="size-10"
            aria-label={`Thông tin nội bộ ${department.name}`} onClick={() => openMetadata(department)}>
            <Pencil className="size-4" />
          </Button>}
        </div>
        {expanded && department.employees.length > 0 && (
          <ul aria-label={`Nhân sự trực thuộc ${department.name}`} className="ml-2 space-y-1 border-l border-border py-2 pl-3 md:ml-4 md:pl-4">
            {department.employees.map((employee) => (
              <li key={employee.id} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                <p className="break-words font-medium">{employee.fullName}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {employee.employeeCode} · {employee.position || "Chưa có chức vụ"}
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
        <p className="text-xs text-muted-foreground">Nguồn: 1Office · Dữ liệu ngày {formatSnapshot(comparison.snapshotAt)}</p>
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
        </TabsList>{canManage && <Button variant="ghost" onClick={() => setShowComparison(true)}>Đối soát dữ liệu{comparison.issues > 0 ? ` (${comparison.issues})` : ""}</Button>}</div>
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
        {canManage && <Dialog open={showComparison} onOpenChange={setShowComparison}>
          <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-4xl">
            <DialogHeader><DialogTitle>Đối soát dữ liệu</DialogTitle><DialogDescription>Kiểm tra bản dữ liệu cơ cấu đã lưu.</DialogDescription></DialogHeader>
            <Input aria-label="Tìm đơn vị đối soát" placeholder="Tìm theo tên hoặc mã..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />
          <p className="text-sm text-muted-foreground">
            {comparison.matched}/{initialDepartments.length} đơn vị khớp tên và cấp trên với bản dữ liệu đã lưu.
            Đây không phải kiểm tra trực tiếp trên 1Office.
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Đơn vị</TableHead><TableHead>ID nguồn</TableHead>
                <TableHead>Cấp trên</TableHead><TableHead>Kết quả</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredDepartments.map((department) => <TableRow key={department.id}>
                  <TableCell>
                    <p className="font-medium">{department.name}</p>
                    <p className="text-xs text-muted-foreground">{department.code}</p>
                    {department.syncStatus === "NAME_MISMATCH" && <p className="text-xs">Tên nguồn: {department.source.name}</p>}
                  </TableCell>
                  <TableCell>{department.source.id ?? "—"}</TableCell>
                  <TableCell>
                    {department.parent?.name ?? "Cấp công ty"}
                    {department.syncStatus === "PARENT_MISMATCH" && <p className="text-xs">ID cấp trên nguồn: {department.source.parentId ?? "—"}</p>}
                  </TableCell>
                  <TableCell><SyncBadge status={department.syncStatus} /></TableCell>
                </TableRow>)}
                {filteredDepartments.length === 0 && <TableRow><TableCell colSpan={4}>Không tìm thấy phòng ban phù hợp.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </DialogContent></Dialog>}

      <Dialog open={Boolean(editingDepartment)} onOpenChange={(open) => !open && setEditingDepartment(null)}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thông tin nội bộ phòng ban</DialogTitle>
            <DialogDescription>
              Tên và quan hệ cấp trên lấy từ 1Office. Bạn chỉ có thể chỉnh mã nội bộ và mô tả dùng trong ERP.
            </DialogDescription>
          </DialogHeader>
          {editingDepartment && (
            <Form {...form}>
              <form onSubmit={saveMetadata} className="space-y-4">
                <FormItem>
                  <FormLabel>Tên theo 1Office</FormLabel>
                  <FormControl><Input value={editingDepartment.source.name ?? editingDepartment.name} disabled /></FormControl>
                  <FormDescription>1Office ID {editingDepartment.source.id ?? "chưa liên kết"}</FormDescription>
                </FormItem>
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã nội bộ ERP</FormLabel>
                      <FormControl><Input {...field} onChange={(event) => field.onChange(event.target.value.toUpperCase())} className="font-mono" /></FormControl>
                      <FormDescription>1Office chưa có mã đơn vị; mã này dùng cho mapping và báo cáo ERP.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả nội bộ</FormLabel>
                      <FormControl><Textarea {...field} rows={4} placeholder="Chức năng, phạm vi hoặc ghi chú dùng trong ERP..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingDepartment(null)} disabled={isPending}>Hủy</Button>
                  <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu thông tin"}</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
