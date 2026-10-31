"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createEmployee,
  updateEmployee,
  getEmployees,
} from "@/actions/employee";
import {
  CreateEmployeeSchema,
  type CreateEmployeeInput,
} from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Employee = NonNullable<
  Awaited<ReturnType<typeof getEmployees>>["data"]
>[number];
type Department = { id: number; name: string };
const statuses = {
  ACTIVE: "Đang làm việc",
  LEFT: "Đã nghỉ việc",
  UNKNOWN: "Chưa xác nhận",
};
export function EmployeeManager({
  initialEmployees,
  departments,
  canManage,
}: {
  initialEmployees: Employee[];
  departments: Department[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const rows = initialEmployees.filter(
    (e) =>
      (status === "ALL" || e.employmentStatus === status) &&
      `${e.fullName} ${e.employeeCode} ${e.department?.name ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hồ sơ nhân sự</h1>
          <p className="text-sm text-muted-foreground">
            {initialEmployees.length} hồ sơ ·{" "}
            {
              initialEmployees.filter((e) => e.employmentStatus === "ACTIVE")
                .length
            }{" "}
            đang làm việc theo hồ sơ
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>Thêm nhân sự</Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Nhân sự và tài khoản đăng nhập được quản lý riêng. Hồ sơ chưa xác nhận
        không tính vào số đang làm việc. Hồ sơ được quản lý trực tiếp tại ERP
        sau lần nhập dữ liệu ban đầu.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Tìm nhân sự"
          placeholder="Tìm tên, mã hoặc phòng ban"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger
            className="h-10 w-full sm:w-56"
            aria-label="Tình trạng làm việc"
          >
            <SelectValue>
              {status === "ALL"
                ? "Tất cả tình trạng"
                : statuses[status as keyof typeof statuses]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả tình trạng</SelectItem>
            {Object.entries(statuses).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân sự</TableHead>
              <TableHead>Phòng ban / Chức vụ</TableHead>
              <TableHead>Tình trạng làm việc</TableHead>
              <TableHead>Tài khoản</TableHead>
              {canManage && <TableHead>Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <p className="font-medium">{e.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.employeeCode}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{e.department?.name ?? "Chọn phòng ban"}</p>
                  <p className="text-xs text-muted-foreground">{e.position}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {statuses[e.employmentStatus]}
                  </Badge>
                  {e.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.notes}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {e._count.accounts
                    ? `${e._count.accounts} tài khoản`
                    : "Chưa có tài khoản"}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() => setEditing(e)}
                    >
                      Sửa hồ sơ
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5}>Không tìm thấy nhân sự.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Cập nhật hồ sơ nhân sự" : "Thêm hồ sơ nhân sự"}
            </DialogTitle>
            <DialogDescription>
              Quản lý hồ sơ trực tiếp trong ERP. Mã nhân sự được cấp tự động và
              giữ nguyên. Thay đổi hồ sơ không tự tạo, khóa tài khoản hoặc đổi
              quyền.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <EmployeeForm
              key={editing?.id ?? "new"}
              employee={editing}
              departments={departments}
              done={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function EmployeeForm({
  employee,
  departments,
  done,
}: {
  employee: Employee | null;
  departments: Department[];
  done: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const date = (v: Date | null | undefined) =>
    v ? new Date(v).toISOString().slice(0, 10) : "";
  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: {
      fullName: employee?.fullName ?? "",
      position: employee?.position ?? "",
      departmentId: employee?.departmentId ?? undefined,
      notes: employee?.notes ?? "",
      phone: employee?.phone ?? "",
      email: employee?.email ?? "",
      dateOfBirth: date(employee?.dateOfBirth),
      joinDate: date(employee?.joinDate),
      employmentStatus: employee?.employmentStatus ?? "ACTIVE",
    },
  });
  const fields = [
    { name: "fullName", label: "Họ và tên" },
    { name: "position", label: "Chức vụ" },
    { name: "phone", label: "Điện thoại" },
    { name: "email", label: "Email" },
    { name: "dateOfBirth", label: "Ngày sinh", type: "date" },
    { name: "joinDate", label: "Ngày vào làm", type: "date" },
  ] as const;
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) =>
          start(async () => {
            const r = employee
              ? await updateEmployee({ ...values, id: employee.id })
              : await createEmployee(values);
            if (!r.success) {
              toast.error(r.message);
              return;
            }
            toast.success(r.message);
            router.refresh();
            done();
          }),
        )}
      >
        <div className="rounded-lg border p-3 text-sm">
          <p>
            Mã nhân sự:{" "}
            <span className="font-mono">
              {employee?.employeeCode ?? "Tự cấp khi lưu"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Mã được giữ nguyên khi đổi tên hoặc chuyển phòng ban.
          </p>
        </div>
        {employee?.hrSnapshotAt && (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer py-2">
              Nguồn nhập ban đầu
            </summary>
            <p>
              Danh sách HR ngày{" "}
              {new Date(employee.hrSnapshotAt).toLocaleDateString("vi-VN", {
                timeZone: "UTC",
              })}
              . Hồ sơ hiện tại được cập nhật độc lập.
            </p>
            {employee.hrNotes && (
              <p>Ghi chú trong file gốc: {employee.hrNotes}</p>
            )}
          </details>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type={"type" in f ? f.type : "text"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phòng ban</FormLabel>
                <Select
                  value={field.value?.toString() ?? ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {departments.find((d) => d.id === field.value)?.name ??
                          "Chọn phòng ban"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employmentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tình trạng làm việc</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>{statuses[field.value]}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(statuses).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ghi chú</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  maxLength={5000}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending || !form.formState.isReady}>
          {pending ? "Đang lưu…" : "Lưu hồ sơ"}
        </Button>
      </form>
    </Form>
  );
}
