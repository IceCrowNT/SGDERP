"use client";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { TaskFields } from "@/lib/support-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormRequiredHint,
} from "@/components/ui/form";
const fields = TaskFields.pick({
  title: true,
  description: true,
  startAt: true,
  deadline: true,
}).refine(
  (v) =>
    !v.startAt || !v.deadline || new Date(v.deadline) >= new Date(v.startAt),
  {
    path: ["deadline"],
    message: "Hạn hoàn thành phải từ thời gian bắt đầu trở đi.",
  },
);
export type TaskEditValues = z.infer<typeof fields>;
function local(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function TaskEditForm({
  initial,
  pending,
  onSave,
  onCancel,
  onDirtyChange,
  onValuesChange,
  restoredDirty = false,
  formId,
  hideActions = false,
}: {
  formId?: string;
  hideActions?: boolean;
  restoredDirty?: boolean;
  initial: TaskEditValues;
  pending: boolean;
  onSave: (v: TaskEditValues) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onValuesChange: (values: TaskEditValues) => void;
}) {
  const form = useForm<TaskEditValues>({
    resolver: zodResolver(fields),
    defaultValues: initial,
  });
  const dirty = form.formState.isDirty;
  const watched = useWatch({ control: form.control });
  const previousValues = useRef(initial);
  useEffect(() => {
    const values = form.getValues();
    if (JSON.stringify(values) !== JSON.stringify(previousValues.current)) {
      previousValues.current = values;
      onValuesChange(values);
    }
  }, [watched, form, onValuesChange]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  return (
    <Form {...form}>
      <form
        id={formId}
        noValidate
        className="space-y-4 rounded-xl border bg-card p-4 [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:min-w-10"
        onSubmit={form.handleSubmit(onSave)}
      >
        <h3 className="font-semibold">Sửa nội dung và thời gian</h3>
        <FormRequiredHint />
        <fieldset disabled={pending} className="space-y-4">
          {(
            [
              ["title", "Tiêu đề"],
              ["description", "Nội dung"],
            ] as const
          ).map(([name, label]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{label}</FormLabel>
                  <FormControl>
                    {name === "title" ? (
                      <Input {...field} maxLength={255} className="text-base" />
                    ) : (
                      <Textarea
                        {...field}
                        maxLength={20000}
                        className="min-h-24 text-base"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          {(
            [
              ["startAt", "Bắt đầu"],
              ["deadline", "Hạn hoàn thành"],
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
                      type="datetime-local"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={local(field.value)}
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
          ))}
          {!hideActions && (
            <div className="flex flex-wrap gap-2">
              <Button type="submit">
                {pending ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (
                    !(dirty || restoredDirty) ||
                    window.confirm("Bỏ phần chỉnh sửa chưa lưu?")
                  )
                    onCancel();
                }}
              >
                Bỏ chỉnh sửa
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </Form>
  );
}
