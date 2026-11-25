"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { createSupportTask, getTaskOptions } from "@/actions/support-task";
import { useTaskDraft } from "./TaskDraftProvider";
import { TaskFields, TASK_CATEGORIES, canTask } from "@/lib/support-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
type Options = Extract<
  Awaited<ReturnType<typeof getTaskOptions>>,
  { success: true }
>;
export type TaskValues = z.infer<typeof TaskFields>;
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="min-h-10 w-full">
          <SelectValue placeholder="Chọn…" />
        </SelectTrigger>
        <SelectContent className="[&_[data-slot=select-item]]:min-h-10 [&_[data-slot=select-scroll-up-button]]:min-h-10 [&_[data-slot=select-scroll-down-button]]:min-h-10">
          {Object.entries(options).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
const defaults: TaskValues = {
  title: "",
  description: "",
  category: "IT",
  nature: "HO_TRO",
  priority: "BINH_THUONG",
  targetType: "CA_NHAN",
  targetId: 0,
  acceptance: "NGUOI_YEU_CAU",
  startAt: null,
  deadline: null,
};
function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function TaskCreate({
  initialValues,
  initialRequestId,
  embedded = false,
  onCreated,
  onBusy,
}: {
  initialValues?: TaskValues;
  initialRequestId?: string;
  embedded?: boolean;
  onCreated?: (id: number) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [cached, cache] = useTaskDraft<{
    values: TaskValues;
    requestId: string;
  }>(`create:${initialRequestId ?? "manual"}`);
  const [open, setOpen] = useState(false),
    [options, setOptions] = useState<Options | null>(null),
    [pending, start] = useTransition(),
    [error, setError] = useState(""),
    [requestId, setRequestId] = useState(
      initialRequestId ?? cached?.requestId ?? "",
    );
  const router = useRouter();
  const form = useForm<TaskValues>({
    resolver: zodResolver(TaskFields),
    defaultValues: cached?.values ?? initialValues ?? defaults,
  });
  const watched = useWatch({ control: form.control });
  useEffect(() => {
    if (form.formState.isDirty) {
      const values = form.getValues();
      cache({ values, requestId });
    }
  }, [watched, form, cache, requestId]);
  const dirty = form.formState.isDirty;
  useEffect(() => {
    if (!dirty && !pending) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (embedded) return;
      const anchor = (event.target as Element)?.closest?.("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.pathname.startsWith("/media/") ||
        anchor.href === location.href
      )
        return;
      if (pending) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, pending, embedded]);
  const [type, target, category] = useWatch({
    control: form.control,
    name: ["targetType", "targetId", "category"],
  });
  const person = options?.people.find((p) => p.id === target),
    department = options?.departments.find(
      (d) => d.id === (type === "CA_NHAN" ? person?.departmentId : target),
    );
  const managerName = (id: number | null | undefined) =>
    options?.people.find((p) => p.id === id)?.name ?? "Chưa xác định";
  useEffect(() => {
    onBusy?.(pending);
    return () => onBusy?.(false);
  }, [pending, onBusy]);
  useEffect(() => {
    if (!open && !embedded) return;
    let active = true;
    getTaskOptions()
      .then((r) => {
        if (!active) return;
        if (r.success) {
          setOptions(r);
          if (!canTask(r.actions, "CREATE"))
            setError("Bạn chưa được cấp quyền tạo yêu cầu hỗ trợ.");
        } else {
          setOptions(null);
          setError(r.message);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Chưa tải được người/phòng hỗ trợ. Đóng và mở lại để thử lại.",
          );
      });
    return () => {
      active = false;
    };
  }, [open, embedded]);
  const selector = (
    name: "category" | "nature" | "priority" | "targetType" | "acceptance",
    label: string,
    choices: Record<string, string>,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={name === "acceptance"}>{label}</FormLabel>
          <Select
            value={field.value}
            onValueChange={(v) => {
              field.onChange(v);
              if (name === "targetType") form.setValue("targetId", 0);
            }}
          >
            <FormControl>
              <SelectTrigger
                aria-label={label}
                onBlur={field.onBlur}
                ref={field.ref}
                className="min-h-10 w-full"
              >
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="[&_[data-slot=select-item]]:min-h-10 [&_[data-slot=select-scroll-up-button]]:min-h-10 [&_[data-slot=select-scroll-down-button]]:min-h-10">
              {Object.entries(choices).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const dateField = (name: "startAt" | "deadline", label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              ref={field.ref}
              onBlur={field.onBlur}
              value={localDate(field.value)}
              onChange={(e) =>
                field.onChange(
                  e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                )
              }
              className="text-base"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const content = (
    <Form {...form}>
      <form
        noValidate
        className="space-y-4 [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:min-w-10"
        onSubmit={form.handleSubmit((v) => {
          const key = requestId || crypto.randomUUID();
          setRequestId(key);
          setError("");
          start(async () => {
            try {
              const r = await createSupportTask({ ...v, requestId: key });
              if (!r.success) {
                setError(r.message);
                if ("fieldErrors" in r) {
                  for (const [name, errors] of Object.entries(
                    r.fieldErrors ?? {},
                  )) {
                    if (errors?.[0])
                      form.setError(
                        name as keyof TaskValues,
                        { message: errors[0] },
                        { shouldFocus: true },
                      );
                  }
                }
                return;
              }
              form.reset(v);
              cache(undefined);
              toast.success("Đã gửi yêu cầu");
              if (onCreated) {
                onCreated(r.id);
              } else {
                setOpen(false);
                form.reset(defaults);
                setRequestId("");
                router.push(`/tasks/${r.id}`);
              }
            } catch {
              setError(
                "Chưa nhận được kết quả. Thử lại để kiểm tra yêu cầu đã gửi.",
              );
            }
          });
        })}
      >
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <fieldset disabled={pending} className="space-y-4">
          <p className="text-sm">
            Người yêu cầu: <strong>{options?.me.name ?? "Đang tải…"}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Các trường có dấu * là bắt buộc.
          </p>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Tiêu đề</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={255} className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Nội dung</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    maxLength={20000}
                    className="min-h-24 text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {selector("targetType", "Gửi tới", {
            CA_NHAN: "Một người",
            PHONG_BAN: "Phòng ban",
          })}
          <FormField
            control={form.control}
            name="targetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>
                  {type === "CA_NHAN" ? "Người hỗ trợ" : "Phòng hỗ trợ"}
                </FormLabel>
                <FormControl>
                  <SearchableSelect
                    label={
                      type === "CA_NHAN" ? "Người hỗ trợ *" : "Phòng hỗ trợ *"
                    }
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    options={
                      type === "CA_NHAN"
                        ? (options?.people ?? [])
                            .filter((p) => p.canReceive || p.id === field.value)
                            .map((p) => ({
                              value: String(p.id),
                              label: p.name,
                              description: p.department,
                              disabled: !p.canReceive,
                            }))
                        : (options?.departments ?? [])
                            .filter((d) => d.canReceive || d.id === field.value)
                            .map((d) => ({
                              value: String(d.id),
                              label: d.name,
                              disabled: !d.canReceive,
                            }))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {options &&
            !(type === "CA_NHAN" ? options.people : options.departments).some(
              (p) => p.canReceive,
            ) && (
              <p className="text-sm text-destructive">
                Chưa có {type === "CA_NHAN" ? "người" : "phòng"} hỗ trợ đủ điều
                kiện. Cần khai báo quản lý và cấp quyền Công việc.
              </p>
            )}
          {department && (
            <p className="text-sm text-muted-foreground">
              Phòng hỗ trợ: {department.name}
              {type === "PHONG_BAN" ? " · Quản lý sẽ phân công nhân viên." : ""}
            </p>
          )}
          {type === "PHONG_BAN" && Boolean(department?.unavailable) && (
            <p role="status" className="text-sm text-destructive">
              Có {department?.unavailable} thành viên chưa có tài khoản hoạt
              động hoặc quyền Xem Công việc nên chưa nhận được thông báo.
            </p>
          )}
          {options?.me.managerError && (
            <p className="text-sm text-destructive">
              {options.me.managerError}
            </p>
          )}
          {selector("acceptance", "Nghiệm thu", {
            NGUOI_YEU_CAU: "Người yêu cầu nghiệm thu",
            QUAN_LY: "Quản lý trực tiếp người yêu cầu nghiệm thu",
            KHONG_CAN: "Không cần",
          })}
          {dateField("deadline", "Hạn hoàn thành")}
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Thông tin thêm · {TASK_CATEGORIES[category]}
            </summary>
            <div className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {selector("category", "Hạng mục", TASK_CATEGORIES)}
                {selector("nature", "Tính chất", {
                  HO_TRO: "Hỗ trợ",
                  SUA_CHUA: "Sửa chữa",
                  KHAC: "Khác",
                })}
                {selector("priority", "Mức độ", {
                  BINH_THUONG: "Bình thường",
                  KHAN: "Khẩn",
                })}
              </div>
              {dateField("startAt", "Bắt đầu (trống: thời điểm gửi)")}
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Quản lý người yêu cầu:{" "}
                  {options?.me.managerSource === "TOP_LEVEL"
                    ? "Không có cấp quản lý phía trên"
                    : managerName(options?.me.managerId)}
                  {options?.me.managerSource === "DEPARTMENT" ||
                  options?.me.managerSource === "ANCESTOR"
                    ? " · Theo cơ cấu phòng ban"
                    : options?.me.managerSource === "EXPLICIT"
                      ? " · Chỉ định riêng"
                      : ""}
                </p>
                <p>
                  {type === "PHONG_BAN"
                    ? "Người phụ trách phòng hỗ trợ"
                    : "Quản lý người hỗ trợ"}
                  :{" "}
                  {managerName(
                    type === "PHONG_BAN"
                      ? department?.managerId
                      : person?.managerId,
                  )}
                </p>
              </div>
            </div>
          </details>
          <p className="text-xs text-muted-foreground">
            Phần đang nhập được giữ khi chuyển trang trong phiên này. Sau khi
            tạo, có thể thêm ảnh/tài liệu mô tả tại chi tiết công việc.
          </p>
          <Button
            type="submit"
            disabled={
              pending || !options || !canTask(options.actions, "CREATE")
            }
          >
            {pending ? "Đang gửi…" : "Gửi yêu cầu"}
          </Button>
        </fieldset>
      </form>
    </Form>
  );
  if (embedded) return content;
  return (
    <>
      <Button
        className="min-h-10 min-w-10"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Yêu cầu hỗ trợ
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!pending) setOpen(v);
        }}
      >
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-2xl [&_[data-slot=dialog-close]]:grid [&_[data-slot=dialog-close]]:min-h-10 [&_[data-slot=dialog-close]]:min-w-10 [&_[data-slot=dialog-close]]:place-items-center">
          <DialogHeader className="pr-10">
            <DialogTitle>Tạo yêu cầu hỗ trợ</DialogTitle>
            <DialogDescription>
              Gửi người hoặc phòng hỗ trợ. Hạn hoàn thành có thể để trống.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
}
