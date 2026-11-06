"use client";
import { useState, useTransition } from "react";
import {
  useForm,
  useWatch,
  useFieldArray,
  useFormContext,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  saveWorkflowTemplate,
  saveWorkflowDraft,
  actOnWorkflow,
} from "@/actions/workflow";
import {
  WorkflowTemplateSchema,
  WorkflowDraftSchema,
  WorkflowCommandSchema,
  type WorkflowTemplateInput,
  type WorkflowDraftInput,
  type WorkflowCommandInput,
} from "@/lib/validations/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormRequiredHint,
} from "@/components/ui/form";
export type PersonOption = { id: number; name: string };
export function TextField({
  name,
  label,
  required = false,
  multiline = false,
  readOnly = false,
}: {
  name: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea
                {...field}
                aria-required={required}
                readOnly={readOnly}
                rows={4}
              />
            ) : (
              <Input {...field} aria-required={required} readOnly={readOnly} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
export function ChoiceField({
  name,
  label,
  options,
  numeric = false,
  required = true,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  numeric?: boolean;
  required?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <Select
            value={field.value == null ? "" : String(field.value)}
            onValueChange={(v) => field.onChange(numeric ? Number(v) : v)}
          >
            <FormControl>
              <SelectTrigger
                ref={field.ref}
                onBlur={field.onBlur}
                aria-required={required}
                className="w-full h-10"
              >
                <SelectValue placeholder="Chọn…" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
function applyErrors<T extends FieldValues>(
  form: ReturnType<typeof useForm<T>>,
  r: { message: string; fieldErrors?: Record<string, string[] | undefined> },
) {
  for (const [key, errors] of Object.entries(r.fieldErrors ?? {}))
    if (errors?.[0]) form.setError(key as Path<T>, { message: errors[0] });
  toast.error(r.message);
}
export function TemplateForm({
  initial,
  people,
  done,
}: {
  initial?: WorkflowTemplateInput;
  people: PersonOption[];
  done: () => void;
}) {
  const form = useForm<WorkflowTemplateInput>({
    resolver: zodResolver(WorkflowTemplateSchema),
    defaultValues: initial ?? {
      code: "",
      name: "",
      description: "",
      steps: [
        {
          name: "Duyệt yêu cầu",
          instructions: "",
          kind: "APPROVAL",
          assignment: "REQUESTER_DEPARTMENT_HEAD",
          employeeId: null,
        },
      ],
    },
  });
  const watchedSteps = useWatch({ control: form.control, name: "steps" });
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "steps",
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(
          (v) =>
            start(async () => {
              setError("");
              const r = await saveWorkflowTemplate(v);
              if (!r.success) {
                setError(r.message);
                applyErrors(form, r);
                return;
              }
              toast.success(r.message);
              done();
            }),
          () => toast.error("Kiểm tra các trường bắt buộc."),
        )}
      >
        <FormRequiredHint />
        <TextField
          name="code"
          label="Mã mẫu"
          required={!initial?.id}
          readOnly={Boolean(initial?.id)}
        />
        <TextField name="name" label="Tên mẫu" required />
        <TextField name="description" label="Mô tả" multiline />
        <div className="space-y-4">
          {fields.map((f, i) => (
            <section key={f.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-semibold">Bước {i + 1}</h3>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10"
                    disabled={i === 0 || pending}
                    onClick={() => move(i, i - 1)}
                  >
                    Lên
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10"
                    disabled={i === fields.length - 1 || pending}
                    onClick={() => move(i, i + 1)}
                  >
                    Xuống
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10"
                    disabled={fields.length === 1 || pending}
                    onClick={() => remove(i)}
                  >
                    Bỏ bước
                  </Button>
                </div>
              </div>
              <TextField
                name={`steps.${i}.name`}
                label={`Tên bước ${i + 1}`}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceField
                  name={`steps.${i}.kind`}
                  label={`Loại bước ${i + 1}`}
                  options={[
                    { value: "APPROVAL", label: "Duyệt" },
                    { value: "TASK", label: "Thực hiện" },
                  ]}
                />
                <ChoiceField
                  name={`steps.${i}.assignment`}
                  label={`Cách chọn người bước ${i + 1}`}
                  options={[
                    {
                      value: "REQUESTER_DEPARTMENT_HEAD",
                      label: "Phụ trách phòng người gửi",
                    },
                    { value: "SPECIFIC_EMPLOYEE", label: "Nhân sự cụ thể" },
                  ]}
                />
              </div>
              {watchedSteps[i]?.assignment === "SPECIFIC_EMPLOYEE" && (
                <ChoiceField
                  name={`steps.${i}.employeeId`}
                  label={`Người xử lý bước ${i + 1}`}
                  numeric
                  options={people.map((p) => ({
                    value: String(p.id),
                    label: p.name,
                  }))}
                />
              )}
              <TextField
                name={`steps.${i}.instructions`}
                label={`Hướng dẫn bước ${i + 1}`}
                multiline
              />
            </section>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={fields.length >= 20 || pending}
          onClick={() =>
            append({
              name: "",
              instructions: "",
              kind: "TASK",
              assignment: "SPECIFIC_EMPLOYEE",
              employeeId: null,
            })
          }
        >
          Thêm bước
        </Button>
        {form.formState.errors.steps?.root?.message && (
          <p role="alert" className="text-destructive">
            {form.formState.errors.steps.root.message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button disabled={pending} type="submit">
            {pending ? "Đang lưu…" : "Lưu mẫu nháp"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
export function DraftForm({
  initial,
  templates,
  done,
}: {
  initial?: WorkflowDraftInput;
  templates: {
    id: number;
    name: string;
    revision: number;
    steps: { name: string; assignment: string; employeeName?: string }[];
  }[];
  done: (id: number) => void;
}) {
  const form = useForm<WorkflowDraftInput>({
    resolver: zodResolver(WorkflowDraftSchema),
    defaultValues: initial ?? {
      templateId: templates[0]?.id,
      title: "",
      content: "",
    },
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const templateId = useWatch({ control: form.control, name: "templateId" });
  const selected = templates.find((t) => t.id === templateId);
  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(
          (v) =>
            start(async () => {
              setError("");
              const r = await saveWorkflowDraft(v);
              if (!r.success) {
                setError(r.message);
                applyErrors(form, r);
                return;
              }
              toast.success(r.message);
              done(r.id);
            }),
          () => toast.error("Kiểm tra các trường bắt buộc."),
        )}
      >
        <FormRequiredHint />
        <ChoiceField
          name="templateId"
          label="Mẫu quy trình"
          numeric
          options={templates.map((t) => ({
            value: String(t.id),
            label: `${t.name} · v${t.revision}`,
          }))}
        />
        {selected && (
          <ol className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
            {selected.steps.map((b, i) => (
              <li key={i}>
                {i + 1}. {b.name} —{" "}
                {b.assignment === "REQUESTER_DEPARTMENT_HEAD"
                  ? "Phụ trách phòng của bạn (xác định khi bước bắt đầu)"
                  : b.employeeName || "Người đã chỉ định"}
              </li>
            ))}
          </ol>
        )}
        <TextField name="title" label="Tiêu đề yêu cầu" required />
        <TextField name="content" label="Nội dung yêu cầu" multiline required />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || !templates.length}>
          {pending ? "Đang lưu…" : "Lưu hồ sơ nháp"}
        </Button>
      </form>
    </Form>
  );
}
export function CommandForm({
  initial,
  people,
  done,
}: {
  initial: WorkflowCommandInput;
  people: PersonOption[];
  done: () => void;
}) {
  const form = useForm<WorkflowCommandInput>({
    resolver: zodResolver(WorkflowCommandSchema),
    defaultValues: initial,
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(
          (v) =>
            start(async () => {
              setError("");
              const r = await actOnWorkflow(v);
              if (!r.success) {
                setError(r.message);
                applyErrors(form, r);
                return;
              }
              toast.success(r.message);
              done();
            }),
          () => toast.error("Kiểm tra thông tin còn thiếu."),
        )}
      >
        <FormRequiredHint />
        {initial.command === "REASSIGN" && (
          <ChoiceField
            name="employeeId"
            label="Người nhận công việc"
            numeric
            options={people.map((p) => ({
              value: String(p.id),
              label: p.name,
            }))}
          />
        )}
        <TextField
          name="reason"
          label="Ý kiến / lý do"
          multiline
          required={["REJECT", "REASSIGN", "CANCEL"].includes(initial.command)}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Đang xử lý…" : "Xác nhận"}
        </Button>
      </form>
    </Form>
  );
}
