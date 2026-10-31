import { z } from "zod";
const optionalDate = z
  .string()
  .refine(
    (v) =>
      !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))),
    "Ngày không hợp lệ",
  )
  .optional()
  .nullable();
export const CreateEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nhập họ và tên").max(255),
    position: z.string().trim().max(100).optional().nullable(),
    departmentId: z
      .number({
        required_error: "Chọn phòng ban",
        invalid_type_error: "Chọn phòng ban",
      })
      .int()
      .positive("Chọn phòng ban"),
    notes: z
      .string()
      .trim()
      .max(5000, "Ghi chú tối đa 5.000 ký tự")
      .optional()
      .nullable(),
    phone: z.string().trim().max(20).optional().nullable(),
    email: z
      .union([z.literal(""), z.string().trim().email("Email không hợp lệ")])
      .optional()
      .nullable(),
    dateOfBirth: optionalDate,
    joinDate: optionalDate,
    employmentStatus: z.enum(["ACTIVE", "LEFT", "UNKNOWN"]),
  })
  .strict(
    "Biểu mẫu chứa trường không được phép sửa (mã nhân sự hoặc thông tin nguồn).",
  );
export const UpdateEmployeeSchema = CreateEmployeeSchema.extend({
  id: z.number().int().positive(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export const AccountSchema = z.object({
  id: z.number().int().positive().optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9_.-]+$/, "Tên đăng nhập không dấu"),
  employeeId: z.number().int().positive().nullable(),
  displayName: z.string().trim().min(2, "Nhập tên hiển thị").max(255),
  password: z
    .string()
    .max(100)
    .refine((v) => !v || v.length >= 6, "Mật khẩu tối thiểu 6 ký tự"),
  isActive: z.boolean(),
  roleIds: z.array(z.number().int().positive()),
});
export type AccountInput = z.infer<typeof AccountSchema>;
