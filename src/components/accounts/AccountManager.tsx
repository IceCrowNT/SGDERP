"use client";
import { useState, useTransition } from "react";
import { AccountCredentials } from "./AccountCredentials";
import { usernameBase } from "@/lib/username";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getAccounts, saveAccount } from "@/actions/account";
import { AccountSchema, type AccountInput } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

type Account = NonNullable<
  Awaited<ReturnType<typeof getAccounts>>["data"]
>[number];
type Props = {
  accounts: Account[];
  employees: {
    id: number;
    ho_ten: string;
    ma_nhan_su: string;
    tinh_trang_lam_viec: string;
  }[];
  roles: { id: number; ten_vai_tro: string }[];
};
export function AccountManager({ accounts, employees, roles }: Props) {
  const [editing, setEditing] = useState<Account | null | undefined>();
  const [search, setSearch] = useState("");
  const rows = accounts.filter((a) =>
    `${a.ten_dang_nhap} ${a.nhan_su?.ho_ten ?? a.ten_hien_thi}`
      .toLocaleLowerCase("vi")
      .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tài khoản đăng nhập</h1>
          <p className="text-sm text-muted-foreground">
            {accounts.length} tài khoản ·{" "}
            {accounts.filter((a) => a.cho_phep_dang_nhap).length} đang mở
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>Tạo tài khoản</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Một nhân sự có thể có nhiều tài khoản với quyền riêng. Khóa tài khoản
        không thay đổi tình trạng làm việc.
      </p>
      <Input
        aria-label="Tìm tài khoản"
        placeholder="Tìm tên đăng nhập hoặc người sở hữu"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Người sở hữu</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.ten_dang_nhap}</TableCell>
                <TableCell>
                  {a.nhan_su ? (
                    <>
                      <p>{a.nhan_su.ho_ten}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.nhan_su.ma_nhan_su}
                        {a.nhan_su.tinh_trang_lam_viec === "LEFT"
                          ? " · Đã nghỉ việc — không được đăng nhập"
                          : ""}
                      </p>
                    </>
                  ) : (
                    "Tài khoản hệ thống / chưa liên kết"
                  )}
                </TableCell>
                <TableCell>
                  {a.danh_sach_vai_tro
                    .map((r) => r.vai_tro.ten_vai_tro)
                    .join(", ") || "Chưa cấp quyền"}
                </TableCell>
                <TableCell>
                  {a.cho_phep_dang_nhap ? "Đang mở" : "Đã khóa"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => setEditing(a)}
                  >
                    Sửa tài khoản
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Cập nhật tài khoản" : "Tạo tài khoản"}
            </DialogTitle>
            <DialogDescription>
              Chọn nhân sự sở hữu và quyền cho riêng tài khoản này. Để trống mật
              khẩu khi sửa nếu muốn giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <AccountForm
              key={editing?.id ?? "new"}
              account={editing}
              employees={employees}
              roles={roles}
              done={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function AccountForm({
  account,
  employees,
  roles,
  done,
}: Omit<Props, "accounts"> & { account: Account | null; done: () => void }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  }>();
  const form = useForm<AccountInput>({
    resolver: zodResolver(AccountSchema),
    defaultValues: {
      id: account?.id,
      username: account?.ten_dang_nhap ?? "",
      displayName: account?.ten_hien_thi ?? "",
      employeeId: account?.employee_id ?? null,
      password: "",
      isActive: account?.cho_phep_dang_nhap ?? true,
      roleIds: account?.danh_sach_vai_tro.map((r) => r.role_id) ?? [],
    },
  });
  const employeeId = useWatch({ control: form.control, name: "employeeId" });
  const left =
    employees.find((e) => e.id === employeeId)?.tinh_trang_lam_viec ===
    "LEFT";
  if (credentials)
    return <AccountCredentials credentials={credentials} done={done} />;
  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((v) =>
          start(async () => {
            const r = await saveAccount(v);
            if (!r.success) {
              if ("fieldErrors" in r && r.fieldErrors)
                for (const [key, messages] of Object.entries(r.fieldErrors)) {
                  if (messages?.[0])
                    form.setError(key as keyof AccountInput, {
                      message: messages[0],
                    });
                }
              toast.error(r.message);
              return;
            }
            toast.success(r.message);
            router.refresh();
            if (r.credentials) setCredentials(r.credentials);
            else done();
          }),
        )}
      >
        {!account && (
          <p className="text-sm text-muted-foreground">
            Tên đăng nhập dự kiến:{" "}
            {usernameBase(
              employees.find((e) => e.id === employeeId)?.ho_ten ?? "",
              employeeId ?? undefined,
            )}
            . Để trống tên đăng nhập và mật khẩu để tự cấp. Không chọn vai trò
            sẽ dùng DEFAULT (chỉ quyền cá nhân).
          </p>
        )}
        <FormField
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel required={!account}>Nhân sự sở hữu</FormLabel>
              <Select
                value={field.value?.toString() ?? "NONE"}
                onValueChange={(v) => {
                  field.onChange(v === "NONE" ? null : Number(v));
                  const employee = employees.find(
                    (e) => e.id === Number(v),
                  );
                  if (employee) form.setValue("displayName", employee.ho_ten);
                  if (employee?.tinh_trang_lam_viec === "LEFT")
                    form.setValue("isActive", false);
                }}
              >
                <FormControl>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {employees.find((e) => e.id === field.value)
                        ?.ho_ten ?? "Chọn nhân sự"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NONE">Chọn nhân sự</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.ma_nhan_su} — {e.ho_ten}
                      {e.tinh_trang_lam_viec === "LEFT"
                        ? " · Đã nghỉ việc"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {(
          [
            ["username", "Tên đăng nhập"],
            ["displayName", "Tên hiển thị"],
            ["password", "Mật khẩu"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel required={name === "displayName"}>{label}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    readOnly={name === "username" && Boolean(account)}
                    type={name === "password" ? "password" : "text"}
                    autoComplete={name === "password" ? "new-password" : "off"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        {left && (
          <p className="text-sm text-destructive">
            Nhân sự đã nghỉ việc, tài khoản không được phép đăng nhập. Làm việc
            trở lại không tự mở tài khoản.
          </p>
        )}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  disabled={left}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              </FormControl>
              <FormLabel>Cho phép đăng nhập</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="roleIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vai trò của tài khoản</FormLabel>
              <div className="space-y-2">
                {roles.map((r) => (
                  <label
                    key={r.id}
                    className="flex min-h-10 items-center gap-2"
                  >
                    <Checkbox
                      checked={field.value.includes(r.id)}
                      onCheckedChange={(v) =>
                        field.onChange(
                          v
                            ? [...field.value, r.id]
                            : field.value.filter((id) => id !== r.id),
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
        <Button type="submit" disabled={pending || !form.formState.isReady}>
          {pending ? "Đang lưu…" : "Lưu tài khoản"}
        </Button>
      </form>
    </Form>
  );
}
