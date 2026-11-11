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
export const EmployeeFieldsSchema = z
  .object({
    createAccount: z.boolean().optional(),
    accountUsername: z.string().trim().toLowerCase().max(100).optional(),
    accountPassword: z.string().max(100).optional(),
    accountRoleIds: z.array(z.number().int().positive()).optional(),
    fullName: z
      .string({
        required_error: "Vui lòng nhập họ và tên",
        invalid_type_error: "Vui lòng nhập họ và tên",
      })
      .trim()
      .min(1, "Vui lòng nhập họ và tên")
      .min(2, "Họ và tên phải có ít nhất 2 ký tự")
      .max(255, "Họ và tên tối đa 255 ký tự"),
    position: z.string().trim().max(100).optional().nullable(),
    workLocationId: z
      .number()
      .int()
      .positive("Chọn vị trí hợp lệ")
      .nullable()
      .optional(),
    locationVersion: z
      .string()
      .datetime("Hồ sơ đã cũ, hãy tải lại trang")
      .optional(),
    confirmLocationMove: z.boolean().optional(),
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
    employmentStatus: z.enum(["ACTIVE", "LEFT", "UNKNOWN"], {
      required_error: "Vui lòng chọn tình trạng làm việc",
      invalid_type_error: "Vui lòng chọn tình trạng làm việc",
    }),
  })
  .strict(
    "Biểu mẫu chứa trường không được phép sửa (mã nhân sự hoặc thông tin nguồn).",
  );
function validateAccount(
  v: z.infer<typeof EmployeeFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  if (
    !v.createAccount &&
    !v.accountUsername &&
    !v.accountPassword &&
    !v.accountRoleIds?.length
  )
    return;
  if (v.accountUsername && !/^[a-z0-9_.-]{3,100}$/.test(v.accountUsername))
    ctx.addIssue({
      code: "custom",
      path: ["accountUsername"],
      message: "Nhập tên đăng nhập ít nhất 3 ký tự, không dấu.",
    });
  if (v.accountPassword && v.accountPassword.length < 6)
    ctx.addIssue({
      code: "custom",
      path: ["accountPassword"],
      message: "Nhập mật khẩu khởi tạo tối thiểu 6 ký tự.",
    });
  if (v.employmentStatus === "LEFT")
    ctx.addIssue({
      code: "custom",
      path: ["accountUsername"],
      message: "Không tạo tài khoản cho nhân sự đã nghỉ việc.",
    });
}
export const CreateEmployeeSchema =
  EmployeeFieldsSchema.superRefine(validateAccount);
export const UpdateEmployeeSchema = EmployeeFieldsSchema.extend({
  id: z.number().int().positive(),
}).superRefine(validateAccount);
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export const AccountSchema = z
  .object({
    id: z.number().int().positive().optional(),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .max(100)
      .refine(
        (v) => !v || /^[a-z0-9_.-]{3,100}$/.test(v),
        "Tên đăng nhập tối thiểu 3 ký tự không dấu",
      ),
    employeeId: z.number().int().positive().nullable(),
    displayName: z.string().trim().min(2, "Nhập tên hiển thị").max(255),
    password: z
      .string()
      .max(100)
      .refine((v) => !v || v.length >= 6, "Mật khẩu tối thiểu 6 ký tự"),
    isActive: z.boolean(),
    roleIds: z.array(z.number().int().positive()).max(100),
  })
  .strict();
export type AccountInput = z.infer<typeof AccountSchema>;
