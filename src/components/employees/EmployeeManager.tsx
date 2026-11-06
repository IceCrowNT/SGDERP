"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountCredentials } from "@/components/accounts/AccountCredentials";
import { usernameBase } from "@/lib/username";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createEmployee,
  updateEmployee,
  getEmployees,
} from "@/actions/employee";
import {
  CreateEmployeeSchema,
  EmployeeFieldsSchema,
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
  FormRequiredHint,
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
type AccountOptions = {
  accountAccess: boolean;
  roles: Array<{ id: number; ten_vai_tro: string }>;
  accounts: Array<{
    id: number;
    employee_id: number | null;
    ten_dang_nhap: string;
    cho_phep_dang_nhap: boolean;
    danh_sach_vai_tro: Array<{ vai_tro: { ten_vai_tro: string } }>;
  }>;
};
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
  accountAccess,
  roles,
  accounts,
}: {
  initialEmployees: Employee[];
  departments: Department[];
  canManage: boolean;
} & AccountOptions) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const rows = initialEmployees.filter(
    (e) =>
      (status === "ALL" || e.tinh_trang_lam_viec === status) &&
      `${e.ho_ten} ${e.ma_nhan_su} ${e.phong_ban?.ten_phong_ban ?? ""}`
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
              initialEmployees.filter((e) => e.tinh_trang_lam_viec === "ACTIVE")
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
                  <p className="font-medium">{e.ho_ten}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.ma_nhan_su}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{e.phong_ban?.ten_phong_ban ?? "Chọn phòng ban"}</p>
                  <p className="text-xs text-muted-foreground">{e.chuc_vu}</p>
                  {e.danh_sach_phong_phu_trach.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Phụ trách:{" "}
                      {e.danh_sach_phong_phu_trach
                        .map((d) => d.ten_phong_ban)
                        .join(", ")}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {statuses[e.tinh_trang_lam_viec]}
                  </Badge>
                  {e.ghi_chu && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.ghi_chu}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {e._count.danh_sach_tai_khoan
                    ? `${e._count.danh_sach_tai_khoan} tài khoản`
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Cập nhật hồ sơ nhân sự" : "Thêm hồ sơ nhân sự"}
            </DialogTitle>
            <DialogDescription>
              Quản lý hồ sơ trực tiếp trong ERP. Mã nhân sự được cấp tự động và
              giữ nguyên. Chuyển sang đã nghỉ việc sẽ tự khóa tất cả tài khoản
              liên kết.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <EmployeeForm
              key={editing?.id ?? "new"}
              employee={editing}
              departments={departments}
              accountAccess={accountAccess}
              roles={roles}
              accounts={accounts}
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
  accountAccess,
  roles,
  accounts,
}: {
  employee: Employee | null;
  departments: Department[];
  done: () => void;
} & AccountOptions) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  }>();
  const [pending, start] = useTransition();
  const date = (v: Date | null | undefined) =>
    v ? new Date(v).toISOString().slice(0, 10) : "";
  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: {
      createAccount: !employee && accountAccess,
      accountUsername: "",
      accountPassword: "",
      accountRoleIds: [],
      fullName: employee?.ho_ten ?? "",
      position: employee?.chuc_vu ?? "",
      departmentId: employee?.department_id ?? undefined,
      notes: employee?.ghi_chu ?? "",
      phone: employee?.so_dien_thoai ?? "",
      email: employee?.thu_dien_tu ?? "",
      dateOfBirth: date(employee?.ngay_sinh),
      joinDate: date(employee?.ngay_vao_lam),
      employmentStatus: employee?.tinh_trang_lam_viec ?? "ACTIVE",
    },
  });
  const [createAccount, fullName, employmentStatus] = useWatch({
    control: form.control,
    name: ["createAccount", "fullName", "employmentStatus"],
  });
  const leaving = employmentStatus === "LEFT";
  const linkedAccounts = accounts.filter(
    (a) => a.employee_id === employee?.id,
  );
  const fields = [
    { name: "fullName", label: "Họ và tên" },
    { name: "position", label: "Chức vụ" },
    { name: "phone", label: "Điện thoại" },
    { name: "email", label: "Email" },
    { name: "dateOfBirth", label: "Ngày sinh", type: "date" },
    { name: "joinDate", label: "Ngày vào làm", type: "date" },
  ] as const;
  if (credentials)
    return <AccountCredentials credentials={credentials} done={done} />;
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        noValidate
        onSubmit={form.handleSubmit(
          (values) =>
            start(async () => {
              const r = employee
                ? await updateEmployee({ ...values, id: employee.id })
                : await createEmployee(values);
              if (!r.success) {
                if ("fieldErrors" in r && r.fieldErrors) {
                  let focusFirst = true;
                  for (const [key, messages] of Object.entries(r.fieldErrors)) {
                    if (key in EmployeeFieldsSchema.shape && messages?.[0]) {
                      form.setError(
                        key as keyof CreateEmployeeInput,
                        { type: "server", message: messages[0] },
                        { shouldFocus: focusFirst },
                      );
                      focusFirst = false;
                    }
                  }
                }
                toast.error(r.message);
                return;
              }
              toast.success(r.message);
              router.refresh();
              if (r.credentials) setCredentials(r.credentials);
              else done();
            }),
          () =>
            toast.error(
              "Vui lòng kiểm tra các trường được đánh dấu trong biểu mẫu.",
            ),
        )}
      >
        <FormRequiredHint />
        <div className="rounded-lg border p-3 text-sm">
          <p>
            Mã nhân sự:{" "}
            <span className="font-mono">
              {employee?.ma_nhan_su ?? "Tự cấp khi lưu"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Mã được giữ nguyên khi đổi tên hoặc chuyển phòng ban.
          </p>
        </div>
        {employee?.ngay_chot_nhan_su_hr && (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer py-2">
              Nguồn nhập ban đầu
            </summary>
            <p>
              Danh sách HR ngày{" "}
              {new Date(employee.ngay_chot_nhan_su_hr).toLocaleDateString(
                "vi-VN",
                {
                  timeZone: "UTC",
                },
              )}
              . Hồ sơ hiện tại được cập nhật độc lập.
            </p>
            {employee.ghi_chu_nhan_su_hr && (
              <p>Ghi chú trong file gốc: {employee.ghi_chu_nhan_su_hr}</p>
            )}
          </details>
        )}
        <div
          className={accountAccess ? "grid gap-6 lg:grid-cols-2" : "space-y-4"}
        >
          <div className="min-w-0 space-y-4">
            <h3 className="font-semibold">Thông tin nhân sự</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required={f.name === "fullName"}>
                        {f.label}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          aria-required={f.name === "fullName" || undefined}
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
                    <FormLabel required>Phòng ban</FormLabel>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          aria-required="true"
                          className="h-10 w-full"
                        >
                          <SelectValue>
                            {departments.find((d) => d.id === field.value)
                              ?.name ?? "Chọn phòng ban"}
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
                    <FormLabel required>Tình trạng làm việc</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "LEFT") {
                          form.setValue("createAccount", false);
                          form.setValue("accountUsername", "");
                          form.setValue("accountPassword", "");
                          form.setValue("accountRoleIds", []);
                          form.clearErrors([
                            "accountUsername",
                            "accountPassword",
                            "accountRoleIds",
                          ]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          aria-required="true"
                          className="h-10 w-full"
                        >
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
            {leaving && (
              <p
                role="status"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                Khi lưu, tất cả tài khoản của nhân sự này sẽ bị khóa và các
                phiên đăng nhập bị thu hồi. Chuyển lại đang làm việc không tự mở
                tài khoản.
              </p>
            )}
          </div>
          {accountAccess && (
            <div className="min-w-0 space-y-4 rounded-xl border p-4">
              <h3 className="font-semibold">Tài khoản đăng nhập</h3>
              {linkedAccounts.length > 0 && (
                <ul className="space-y-2" aria-label="Tài khoản liên kết">
                  {linkedAccounts.map((a) => (
                    <li
                      className="rounded-lg bg-muted/40 p-3 text-sm"
                      key={a.id}
                    >
                      <p className="break-all font-medium">
                        {a.ten_dang_nhap} ·{" "}
                        {a.cho_phep_dang_nhap
                          ? "Cho phép đăng nhập"
                          : "Đã khóa"}
                      </p>
                      <p className="text-muted-foreground">
                        {a.danh_sach_vai_tro
                          .map((r) => r.vai_tro.ten_vai_tro)
                          .join(", ") || "Chưa gán vai trò"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {employee && (
                <Button asChild variant="outline">
                  <Link href="/accounts">Quản lý tài khoản và quyền</Link>
                </Button>
              )}
              {leaving ? (
                <p className="text-sm text-muted-foreground">
                  Không cấp tài khoản mới cho nhân sự đã nghỉ việc.
                </p>
              ) : (
                <>
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(createAccount)}
                      disabled={pending}
                      onCheckedChange={(v) => {
                        form.setValue("createAccount", v === true);
                        if (!v) {
                          form.setValue("accountUsername", "");
                          form.setValue("accountPassword", "");
                          form.setValue("accountRoleIds", []);
                        }
                      }}
                    />
                    Tạo tài khoản đăng nhập
                  </label>
                  {createAccount && (
                    <div className="space-y-3">
                      <p className="text-sm">
                        Tên đăng nhập dự kiến:{" "}
                        <strong className="font-mono">
                          {usernameBase(fullName || "")}
                        </strong>
                        . Nếu trùng sẽ tự thêm số khi lưu.
                      </p>
                      <p className="text-sm">
                        Quyền cơ bản: <strong>DEFAULT</strong> · Dashboard, hồ
                        sơ cá nhân và đổi mật khẩu. Mật khẩu tạm được cấp sau
                        khi lưu.
                      </p>
                      <details>
                        <summary className="cursor-pointer py-2 text-sm">
                          Tùy chọn nâng cao
                        </summary>
                        {(
                          [
                            {
                              name: "accountUsername",
                              label: "Tên đăng nhập mới",
                              type: "text",
                            },
                            {
                              name: "accountPassword",
                              label: "Mật khẩu khởi tạo",
                              type: "password",
                            },
                          ] as const
                        ).map((f) => (
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
                                    type={f.type}
                                    autoComplete="off"
                                    placeholder="Để trống để tự cấp"
                                    disabled={pending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                        <FormField
                          control={form.control}
                          name="accountRoleIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vai trò tài khoản mới</FormLabel>
                              <div
                                role="group"
                                aria-label="Vai trò tài khoản mới"
                              >
                                {roles.map((r) => (
                                  <label
                                    key={r.id}
                                    className="flex min-h-10 items-center gap-2 text-sm"
                                  >
                                    <Checkbox
                                      disabled={pending}
                                      checked={
                                        field.value?.includes(r.id) ??
                                        false
                                      }
                                      onCheckedChange={(checked) =>
                                        field.onChange(
                                          checked
                                            ? [
                                                ...(field.value ?? []),
                                                r.id,
                                              ]
                                            : (field.value ?? []).filter(
                                                (id) => id !== r.id,
                                              ),
                                        )
                                      }
                                    />
                                    {r.ten_vai_tro}
                                  </label>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </details>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <Button type="submit" disabled={pending || !form.formState.isReady}>
          {pending ? "Đang lưu…" : "Lưu hồ sơ"}
        </Button>
      </form>
    </Form>
  );
}
