import { z } from "zod";
const level = z.enum(["NONE", "VIEW", "MANAGE"], {
  required_error: "Chọn mức quyền",
  invalid_type_error: "Mức quyền không hợp lệ",
});
export const RoleSchema = z
  .object({
    id: z.number().int().positive().optional(),
    version: z.string().optional(),
    code: z
      .string({ required_error: "Nhập mã vai trò" })
      .trim()
      .min(1, "Nhập mã vai trò")
      .max(50, "Tối đa 50 ký tự")
      .regex(
        /^[A-Z][A-Z0-9_]*$/,
        "Dùng chữ IN HOA không dấu, số và dấu gạch dưới",
      ),
    name: z
      .string({ required_error: "Nhập tên vai trò" })
      .trim()
      .min(1, "Nhập tên vai trò")
      .max(255, "Tối đa 255 ký tự"),
    description: z.string().trim().max(2000, "Tối đa 2.000 ký tự"),
    workflowActions: z
      .array(z.enum(["VIEW", "CREATE", "APPROVE", "EXECUTE", "MANAGE"]))
      .max(5)
      .optional(),
    permissions: z
      .object({
        LOCATIONS: level.optional(),
        HR: level,
        ACCOUNTS: z.enum(["NONE", "MANAGE"]),
        ROLES: level,
        AUDIT: z.enum(["NONE", "VIEW"]),
      })
      .strict(),
  })
  .strict();
export type RoleInput = z.infer<typeof RoleSchema>;
export const RoleDeleteSchema = z
  .object({ id: z.number().int().positive(), version: z.string() })
  .strict();
export const RoleAssignmentSchema = z
  .object({
    accountId: z.number().int().positive(),
    roleIds: z.array(z.number().int().positive()).max(100),
    version: z.string(),
  })
  .strict();
