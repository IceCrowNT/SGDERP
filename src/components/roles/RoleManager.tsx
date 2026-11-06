"use client";
import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ShieldCheck, Plus, Search } from "lucide-react";
import {
  getRoles,
  saveRole,
  deleteRole,
  assignAccountRoles,
} from "@/actions/role";
import { RoleSchema, type RoleInput } from "@/lib/validations/role";
import {
  ROLE_MODULES,
  LEVEL_LABELS,
  WORKFLOW_ACTIONS,
  WORKFLOW_LABELS,
  type WorkflowAction,
} from "@/lib/role-catalog";
import type { PermissionLevel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormRequiredHint,
} from "@/components/ui/form";

type Data = Extract<Awaited<ReturnType<typeof getRoles>>, { success: true }>;
type Role = Data["roles"][number];
type Account = Data["accounts"][number];
function effective(roles: Role[], ids: number[]) {
  const levels: Record<string, PermissionLevel> = {};
  for (const role of roles.filter((r) => ids.includes(r.id)))
    for (const [module, level] of Object.entries(role.permissions)) {
      if (
        level === "MANAGE" ||
        (level === "VIEW" && levels[module] !== "MANAGE")
      )
        levels[module] = level;
    }
  return levels;
}
function PermissionSummary({
  levels,
  actions = [],
}: {
  actions?: WorkflowAction[];
  levels: Record<string, PermissionLevel>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Badge key={a} variant="secondary">
          Quy trình: {WORKFLOW_LABELS[a]}
        </Badge>
      ))}
      {ROLE_MODULES.map((m) =>
        levels[m.code] && levels[m.code] !== "NONE" ? (
          <Badge variant="secondary" key={m.code}>
            {m.label}: {LEVEL_LABELS[levels[m.code]]}
          </Badge>
        ) : null,
      )}
      {!actions.length &&
        !ROLE_MODULES.some(
          (m) => levels[m.code] && levels[m.code] !== "NONE",
        ) && (
          <span className="text-sm text-muted-foreground">
            Có dashboard và hồ sơ cá nhân. Chưa có quyền nghiệp vụ.
          </span>
        )}
    </div>
  );
}
const subscribe = () => () => {};
export function RoleManager({ data }: { data: Data }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Role | null | undefined>();
  const [removing, setRemoving] = useState<Role | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const matches = (value: string) =>
    value
      .toLocaleLowerCase("vi")
      .includes(search.trim().toLocaleLowerCase("vi"));
  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-primary" />
            Vai trò và phân quyền
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {data.roles.length} vai trò · {data.accounts.length} tài khoản
          </p>
        </div>
        {data.canManage && (
          <Button
            className="h-10"
            disabled={!ready}
            onClick={() => setEditing(null)}
          >
            <Plus />
            Thêm vai trò
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Quyền gắn với từng tài khoản. Chức vụ và người phụ trách phòng được quản
        lý riêng tại hồ sơ, cơ cấu phòng ban.
      </p>
      <div className="rounded-xl border bg-muted/30 p-4 text-sm">
        Nhân sự và quản trị áp dụng trong công ty. Quy trình giới hạn theo người
        gửi/người được giao; chỉ người điều phối được xem toàn công ty.
      </div>
      {data.canManage && (
        <p className="text-sm text-muted-foreground">
          Để dùng thử quy trình, cấp quyền trong nhóm “Quy trình và duyệt công
          việc” của vai trò, rồi gán cho từng tài khoản.{" "}
          <Link href="/workflows" className="text-primary">
            Mở quy trình →
          </Link>
        </p>
      )}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          className="pl-9 h-10"
          aria-label="Tìm vai trò hoặc tài khoản"
          placeholder="Tìm tên, mã vai trò hoặc tài khoản…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles" disabled={!ready}>
            Danh sách vai trò
          </TabsTrigger>
          <TabsTrigger value="accounts" disabled={!ready}>
            Quyền của tài khoản
          </TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="space-y-3 mt-4">
          {data.roles
            .filter((r) => matches(`${r.name} ${r.code}`))
            .map((role) => (
              <section
                key={role.id}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{role.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {role.code} · {role.accountCount} tài khoản{" "}
                      {role.system && "· Vai trò hệ thống"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-10"
                      disabled={!ready || role.code === "DEFAULT"}
                      onClick={() => setEditing(role)}
                      aria-label={`${data.canManage ? "Sửa" : "Xem"} vai trò ${role.name}`}
                    >
                      {data.canManage ? "Sửa quyền" : "Xem quyền"}
                    </Button>
                    {data.canManage && !role.system && (
                      <Button
                        variant="outline"
                        className="h-10 text-destructive"
                        disabled={role.accountCount > 0}
                        title={
                          role.accountCount
                            ? "Gỡ khỏi tài khoản trước khi xóa"
                            : undefined
                        }
                        onClick={() => {
                          setError("");
                          setRemoving(role);
                        }}
                        aria-label={`Xóa vai trò ${role.name}`}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground break-words">
                    {role.description}
                  </p>
                )}
                <PermissionSummary
                  levels={role.permissions}
                  actions={role.workflowActions}
                />
              </section>
            ))}
          {!data.roles.some((r) => matches(`${r.name} ${r.code}`)) && (
            <p className="p-6 text-muted-foreground">Không tìm thấy vai trò.</p>
          )}
        </TabsContent>
        <TabsContent value="accounts" className="space-y-3 mt-4">
          {data.accounts
            .filter((a) => matches(`${a.name} ${a.username}`))
            .map((a) => (
              <section
                className="rounded-xl border bg-card p-4 space-y-3"
                key={a.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{a.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {a.username} ·{" "}
                      {a.active ? "Được đăng nhập" : "Đang khóa / đã nghỉ việc"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => setAccount(a)}
                    aria-label={`Vai trò của ${a.username}`}
                  >
                    {data.canManage ? "Gán vai trò" : "Xem quyền"}
                  </Button>
                </div>
                <p className="text-sm">
                  {data.roles
                    .filter((r) => a.roleIds.includes(r.id))
                    .map((r) => r.name)
                    .join(" · ") || "Chưa gán vai trò"}
                </p>
                <PermissionSummary
                  levels={effective(data.roles, a.roleIds)}
                  actions={[
                    ...new Set(
                      data.roles
                        .filter((r) => a.roleIds.includes(r.id))
                        .flatMap((r) => r.workflowActions),
                    ),
                  ]}
                />
              </section>
            ))}
          {!data.accounts.some((a) => matches(`${a.name} ${a.username}`)) && (
            <p className="p-6 text-muted-foreground">
              Không tìm thấy tài khoản.
            </p>
          )}
        </TabsContent>
      </Tabs>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Thông tin vai trò" : "Thêm vai trò"}
            </DialogTitle>
            <DialogDescription>
              Thay đổi quyền áp dụng cho {editing?.accountCount ?? 0} tài khoản
              đang gắn vai trò này.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <RoleForm
              role={editing}
              canManage={data.canManage}
              done={() => {
                setEditing(undefined);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!pending && !open) setRemoving(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Xóa vai trò</DialogTitle>
            <DialogDescription>
              Xóa “{removing?.name}”? Chỉ vai trò không thuộc hệ thống và chưa
              gắn tài khoản mới được xóa.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setRemoving(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (!removing) return;
                  const r = await deleteRole({
                    id: removing.id,
                    version: removing.version,
                  });
                  if (!r.success) {
                    setError(r.message);
                    toast.error(r.message);
                    return;
                  }
                  toast.success(r.message);
                  setRemoving(null);
                  router.refresh();
                })
              }
            >
              {pending ? "Đang xóa…" : "Xác nhận xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(account)}
        onOpenChange={(open) => {
          if (!open) setAccount(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vai trò của tài khoản</DialogTitle>
            <DialogDescription>
              {account?.name} · {account?.username}
            </DialogDescription>
          </DialogHeader>
          {account && (
            <AssignmentForm
              account={account}
              roles={data.roles}
              canManage={data.canManage}
              done={() => {
                setAccount(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function RoleForm({
  role,
  canManage,
  done,
}: {
  role: Role | null;
  canManage: boolean;
  done: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const form = useForm<RoleInput>({
    resolver: zodResolver(RoleSchema),
    defaultValues: {
      id: role?.id,
      version: role?.version,
      code: role?.code ?? "",
      name: role?.name ?? "",
      description: role?.description ?? "",
      workflowActions: role?.workflowActions ?? [],
      permissions: {
        HR: role?.permissions.HR ?? "NONE",
        ACCOUNTS: role?.permissions.ACCOUNTS === "MANAGE" ? "MANAGE" : "NONE",
        ROLES: role?.permissions.ROLES ?? "NONE",
        AUDIT: role?.permissions.AUDIT === "VIEW" ? "VIEW" : "NONE",
      },
    },
  });
  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(
          (v) =>
            start(async () => {
              setError("");
              const r = await saveRole(v);
              if (!r.success) {
                setError(r.message);
                if (r.fieldErrors)
                  for (const [field, messages] of Object.entries(r.fieldErrors))
                    if (messages?.[0])
                      form.setError(field as keyof RoleInput, {
                        message: messages[0],
                      });
                toast.error(r.message);
                return;
              }
              toast.success(r.message);
              done();
            }),
          () => setError("Vui lòng điền đủ các trường bắt buộc."),
        )}
      >
        <FormRequiredHint />
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["code", "Mã vai trò"],
              ["name", "Tên vai trò"],
            ] as const
          ).map(([name, label]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={name === "name" || !role}>
                    {label}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      aria-required={name === "name" || !role}
                      readOnly={
                        !canManage || (name === "code" && Boolean(role))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả</FormLabel>
              <FormControl>
                <Textarea {...field} readOnly={!canManage} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-3">
          {ROLE_MODULES.map((m) => (
            <FormField
              key={m.code}
              control={form.control}
              name={`permissions.${m.code}`}
              render={({ field }) => (
                <FormItem className="rounded-xl border p-3">
                  <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
                    <div>
                      <FormLabel required>{m.label}</FormLabel>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.description}
                      </p>
                    </div>
                    <Select
                      value={field.value}
                      disabled={!canManage || pending}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          aria-required="true"
                          className="h-10 w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {m.levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {LEVEL_LABELS[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <FormField
          control={form.control}
          name="workflowActions"
          render={({ field }) => (
            <FormItem className="rounded-xl border p-3 space-y-3">
              <FormLabel>Quy trình và duyệt công việc</FormLabel>
              <p className="text-sm text-muted-foreground">
                Quản lý được xem toàn công ty và chuyển giao; không được duyệt
                thay. Tạo, duyệt, thực hiện cần quyền Xem và đúng hồ sơ được
                giao.
              </p>
              {WORKFLOW_ACTIONS.map((a) => (
                <label
                  key={a}
                  className="flex items-center gap-3 min-h-10 text-sm"
                >
                  <Checkbox
                    disabled={!canManage || pending}
                    checked={field.value?.includes(a) ?? false}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked
                          ? [...(field.value ?? []), a]
                          : field.value?.filter((v) => v !== a),
                      )
                    }
                  />
                  {WORKFLOW_LABELS[a]}
                </label>
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        {Boolean(role?.retainedPermissions.length) && (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer">
              Quyền cũ được giữ nguyên ({role?.retainedPermissions.length})
            </summary>
            <p className="my-2">
              Các quyền ngoài ma trận hiện hành chưa chỉnh tại đây.
            </p>
            <ul className="list-disc pl-5">
              {role?.retainedPermissions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </details>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={done}
          >
            Đóng
          </Button>
          {canManage && (
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu vai trò"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
function AssignmentForm({
  account,
  roles,
  canManage,
  done,
}: {
  account: Account;
  roles: Role[];
  canManage: boolean;
  done: () => void;
}) {
  const [ids, setIds] = useState(account.roleIds);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Có thể chọn nhiều vai trò. Bỏ hết vai trò sẽ thu hồi quyền chức năng;
        không thay đổi tình trạng đăng nhập.
      </p>
      <div className="space-y-2">
        {roles.map((r) => (
          <label
            key={r.id}
            className="flex min-h-10 items-center gap-3 rounded-lg border p-3"
          >
            <Checkbox
              checked={ids.includes(r.id)}
              disabled={!canManage || pending}
              onCheckedChange={(checked) =>
                setIds(
                  checked ? [...ids, r.id] : ids.filter((id) => id !== r.id),
                )
              }
            />
            <span className="text-sm">
              {r.name}
              <span className="block text-xs text-muted-foreground">
                {r.code}
              </span>
            </span>
          </label>
        ))}
      </div>
      <h3 className="font-semibold text-sm">Quyền hiệu lực sau khi lưu</h3>
      <PermissionSummary
        levels={effective(roles, ids)}
        actions={[
          ...new Set(
            roles
              .filter((r) => ids.includes(r.id))
              .flatMap((r) => r.workflowActions),
          ),
        ]}
      />
      {!account.active && (
        <p className="text-sm text-muted-foreground">
          Tài khoản đang ngừng truy cập. Gán vai trò không mở lại tài khoản.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={pending} onClick={done}>
          Đóng
        </Button>
        {canManage && (
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError("");
                const r = await assignAccountRoles({
                  accountId: account.id,
                  roleIds: ids,
                  version: account.version,
                });
                if (!r.success) {
                  setError(r.message);
                  toast.error(r.message);
                  return;
                }
                toast.success(r.message);
                done();
              })
            }
          >
            {pending ? "Đang lưu…" : "Lưu phân quyền"}
          </Button>
        )}
      </div>
    </div>
  );
}
