"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  Database,
  ExternalLink,
  FolderTree,
  GitCompareArrows,
  Pencil,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { updateDepartment, type DepartmentSyncStatus } from "@/actions/department";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  sourceRecords: number;
  sourceCompanyNodes: number;
  sourceDepartmentRecords: number;
  matched: number;
  issues: number;
  snapshotAt: string | null;
}

interface DepartmentManagerProps {
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
  MATCHED: { label: "Khớp 1Office", detail: "Tên và đơn vị cấp trên đang khớp snapshot nguồn." },
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
      {matched ? <CheckCircle2 className="size-3" /> : <CircleAlert className="size-3" />}
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
  comparison,
  canManage,
}: DepartmentManagerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
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
      [
        department.code,
        department.name,
        department.source.id,
        department.source.name,
        department.source.supervisorName,
        department.parent?.name,
      ].some((value) => value?.toLocaleLowerCase("vi").includes(query))
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

  const matchesSearch = (department: DepartmentItem) =>
    !searchTerm.trim() || filteredDepartments.some((item) => item.id === department.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <FolderTree className="size-7 text-primary" />
              Cơ cấu tổ chức
            </h1>
            <Badge variant="outline" className="gap-1.5">
              <Database className="size-3.5" />
              Nguồn chuẩn: 1Office
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            ERP giữ mã nội bộ và bản sao phục vụ nghiệp vụ. Tên đơn vị cùng quan hệ cha/con được đối
            chiếu với snapshot 1Office và không chỉnh sửa độc lập tại đây.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm shadow-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck className="size-4 text-primary" /> Snapshot {formatSnapshot(comparison.snapshotAt)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {comparison.sourceRecords} bản ghi nguồn gồm {comparison.sourceCompanyNodes} nút công ty và{" "}
            {comparison.sourceDepartmentRecords} đơn vị nghiệp vụ.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Đơn vị ERP</CardDescription>
            <CardTitle className="flex items-center justify-between text-2xl">
              {initialDepartments.length}<Building2 className="size-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Đã liên kết</CardDescription>
            <CardTitle className="flex items-center justify-between text-2xl text-primary">
              {comparison.sourceDepartmentRecords}<GitCompareArrows className="size-5" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Khớp hoàn toàn</CardDescription>
            <CardTitle className="flex items-center justify-between text-2xl">
              {comparison.matched}<CheckCircle2 className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Nhân sự phân bổ</CardDescription>
            <CardTitle className="flex items-center justify-between text-2xl">
              {totalEmployees}<Users className="size-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {comparison.issues > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex gap-3 p-4 text-sm">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Có {comparison.issues} đơn vị cần đối soát</p>
              <p className="text-muted-foreground">Kiểm tra tab “Đối chiếu 1Office” trước khi dùng cơ cấu cho phân quyền hoặc báo cáo.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex gap-3 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">18/18 đơn vị nghiệp vụ đang khớp 1Office</p>
              <p className="text-muted-foreground">Nút công ty ID 23 được ánh xạ ở cấp Company nên không tạo thêm một phòng ban trong ERP.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tìm theo tên, mã ERP, ID 1Office, cấp trên hoặc người giám sát..."
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="tree" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tree"><FolderTree className="size-4" />Cây tổ chức</TabsTrigger>
          <TabsTrigger value="comparison"><GitCompareArrows className="size-4" />Đối chiếu 1Office</TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {rootDepartments.map((root) => {
              const children = initialDepartments.filter((item) => item.parentId === root.id);
              const visibleChildren = children.filter(matchesSearch);
              if (!matchesSearch(root) && visibleChildren.length === 0) return null;
              const childEmployees = children.reduce((total, child) => total + child._count.users, 0);
              return (
                <Card key={root.id} className="overflow-hidden border-border/70 shadow-xs">
                  <CardHeader className="border-b border-border/60 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base leading-snug">{root.name}</CardTitle>
                          <SyncBadge status={root.syncStatus} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono font-semibold text-primary">{root.code}</span>
                          <span>1Office ID {root.source.id ?? "—"}</span>
                          <span>{root._count.users + childEmployees} nhân sự toàn nhánh</span>
                        </div>
                      </div>
                      {canManage && (
                        <Button variant="ghost" size="icon" onClick={() => openMetadata(root)} aria-label={`Sửa metadata ${root.name}`}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 p-4">
                    {visibleChildren.length ? visibleChildren.map((child) => (
                      <div key={child.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/30">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{child.name}</p>
                            <SyncBadge status={child.syncStatus} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-mono text-primary">{child.code}</span> · 1Office ID {child.source.id ?? "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/employees?departmentId=${child.id}`}>{child._count.users} NV<ArrowRight className="size-3.5" /></Link>
                          </Button>
                          {canManage && (
                            <Button variant="ghost" size="icon" onClick={() => openMetadata(child)} aria-label={`Sửa metadata ${child.name}`}>
                              <Pencil className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="flex items-center justify-between rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                        <span>Không có đơn vị con phù hợp bộ lọc</span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/employees?departmentId=${root.id}`}>{root._count.users} nhân sự<ExternalLink className="size-3.5" /></Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {filteredDepartments.map((department) => (
              <Card key={department.id} className="border-border/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{department.name}</p>
                      <p className="text-xs text-muted-foreground">{department.code} · ID {department.source.id ?? "—"}</p>
                    </div>
                    <SyncBadge status={department.syncStatus} />
                  </div>
                  <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-xs">
                    <dt className="text-muted-foreground">Tên nguồn</dt><dd>{department.source.name ?? "Chưa liên kết"}</dd>
                    <dt className="text-muted-foreground">Cấp trên</dt><dd>{department.parent?.name ?? "Cấp công ty"}</dd>
                    <dt className="text-muted-foreground">Giám sát</dt><dd>{department.source.supervisorName ?? "Chưa khai báo"}</dd>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden border-border/70 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã ERP</TableHead>
                  <TableHead>Đơn vị ERP</TableHead>
                  <TableHead>ID / Tên 1Office</TableHead>
                  <TableHead>Cấp trên</TableHead>
                  <TableHead>Người giám sát</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{department.code}</TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{department.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{department._count.users} nhân sự trực tiếp</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">ID {department.source.id ?? "—"}</p>
                      <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">{department.source.name ?? "Chưa liên kết"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{department.parent?.name ?? "Cấp công ty"}</TableCell>
                    <TableCell className="text-sm">{department.source.supervisorName ?? "—"}</TableCell>
                    <TableCell><SyncBadge status={department.syncStatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <p className="text-xs text-muted-foreground">
            {statusContent.MATCHED.detail} Mã ERP và mô tả là metadata nội bộ; 1Office hiện chưa khai báo mã đơn vị.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingDepartment)} onOpenChange={(open) => !open && setEditingDepartment(null)}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cập nhật metadata ERP</DialogTitle>
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
                  <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu metadata"}</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
