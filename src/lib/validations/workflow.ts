import { z } from "zod";
const id = z
  .number({
    required_error: "Chọn dữ liệu bắt buộc",
    invalid_type_error: "Chọn dữ liệu hợp lệ",
  })
  .int()
  .positive("Chọn dữ liệu hợp lệ");
const title = z
  .string({ required_error: "Nhập nội dung bắt buộc" })
  .trim()
  .min(1, "Không được để trống")
  .max(255, "Tối đa 255 ký tự");
export const WorkflowStepSchema = z
  .object({
    name: title,
    instructions: z.string().trim().max(2000),
    kind: z.enum(["APPROVAL", "TASK"]),
    assignment: z.enum(["SPECIFIC_EMPLOYEE", "REQUESTER_DEPARTMENT_HEAD"]),
    employeeId: id.nullable(),
  })
  .strict()
  .refine(
    (v) => v.assignment !== "SPECIFIC_EMPLOYEE" || v.employeeId !== null,
    { path: ["employeeId"], message: "Chọn người xử lý" },
  );
export const WorkflowTemplateSchema = z
  .object({
    id: id.optional(),
    version: z.string().optional(),
    code: z
      .string()
      .trim()
      .min(1, "Nhập mã mẫu")
      .max(50)
      .regex(/^[A-Z][A-Z0-9_]*$/, "Dùng chữ IN HOA không dấu, số và gạch dưới"),
    name: title,
    description: z.string().trim().max(4000),
    steps: z
      .array(WorkflowStepSchema)
      .min(1, "Cần ít nhất một bước")
      .max(20, "Tối đa 20 bước"),
  })
  .strict();
export type WorkflowTemplateInput = z.infer<typeof WorkflowTemplateSchema>;
export const WorkflowTemplateCommandSchema = z
  .object({
    id,
    version: z.string(),
    command: z.enum(["PUBLISH", "RETIRE", "COPY"]),
  })
  .strict();
export const WorkflowDraftSchema = z
  .object({
    id: id.optional(),
    version: z.string().optional(),
    templateId: id,
    title,
    content: z
      .string()
      .trim()
      .min(1, "Nhập nội dung yêu cầu")
      .max(20000, "Tối đa 20.000 ký tự"),
    previousId: id.optional(),
  })
  .strict();
export type WorkflowDraftInput = z.infer<typeof WorkflowDraftSchema>;
export const WorkflowCommandSchema = z
  .object({
    id,
    version: z.string(),
    stepId: id.optional(),
    command: z.enum([
      "SUBMIT",
      "APPROVE",
      "REJECT",
      "COMPLETE",
      "REASSIGN",
      "CANCEL",
    ]),
    reason: z.string().trim().max(4000),
    employeeId: id.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (["REJECT", "REASSIGN", "CANCEL"].includes(v.command) && !v.reason)
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Nhập lý do" });
    if (v.command === "REASSIGN" && !v.employeeId)
      ctx.addIssue({
        code: "custom",
        path: ["employeeId"],
        message: "Chọn người nhận",
      });
    if (
      ["APPROVE", "REJECT", "COMPLETE", "REASSIGN"].includes(v.command) &&
      !v.stepId
    )
      ctx.addIssue({
        code: "custom",
        path: ["stepId"],
        message: "Chọn bước hiện tại",
      });
  });
export type WorkflowCommandInput = z.infer<typeof WorkflowCommandSchema>;
