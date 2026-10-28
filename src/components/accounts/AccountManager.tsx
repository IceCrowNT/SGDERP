"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  employees: { id: number; fullName: string; employeeCode: string }[];
  roles: { id: number; name: string }[];
};
export function AccountManager({ accounts, employees, roles }: Props) {
  const [editing, setEditing] = useState<Account | null | undefined>();
  const [search, setSearch] = useState("");
  const rows = accounts.filter((a) =>
    `${a.username} ${a.employee?.fullName ?? a.displayName}`
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
            {accounts.filter((a) => a.isActive).length} đang mở
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
                <TableCell>{a.username}</TableCell>
                <TableCell>
                  {a.employee ? (
                    <>
                      <p>{a.employee.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.employee.employeeCode}
                        {a.employee.employmentStatus === "LEFT"
                          ? " · Đã nghỉ việc — cần rà soát truy cập"
                          : ""}
                      </p>
                    </>
                  ) : (
                    "Tài khoản hệ thống / chưa liên kết"
                  )}
                </TableCell>
                <TableCell>
                  {a.roles.map((r) => r.role.name).join(", ") ||
                    "Chưa cấp quyền"}
                </TableCell>
                <TableCell>{a.isActive ? "Đang mở" : "Đã khóa"}</TableCell>
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
  const form = useForm<AccountInput>({
    resolver: zodResolver(AccountSchema),
    defaultValues: {
      id: account?.id,
      username: account?.username ?? "",
      displayName: account?.displayName ?? "",
      employeeId: account?.employeeId ?? null,
      password: "",
      isActive: account?.isActive ?? true,
      roleIds: account?.roles.map((r) => r.roleId) ?? [],
    },
  });
  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((v) =>
          start(async () => {
            const r = await saveAccount(v);
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
        <FormField
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nhân sự sở hữu</FormLabel>
              <Select
                value={field.value?.toString() ?? "NONE"}
                onValueChange={(v) => {
                  field.onChange(v === "NONE" ? null : Number(v));
                  const employee = employees.find((e) => e.id === Number(v));
                  if (employee) form.setValue("displayName", employee.fullName);
                }}
              >
                <FormControl>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {employees.find((e) => e.id === field.value)?.fullName ??
                        "Chọn nhân sự"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NONE">Chọn nhân sự</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.employeeCode} — {e.fullName}
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
                <FormLabel>{label}</FormLabel>
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
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
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
                    {r.name}
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
