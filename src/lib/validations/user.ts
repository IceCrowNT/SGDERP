import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(255, "Họ và tên tối đa 255 ký tự"),
  employeeCode: z
    .string()
    .trim()
    .min(3, "Mã nhân sự tối thiểu 3 ký tự")
    .max(50, "Mã nhân sự tối đa 50 ký tự")
    .regex(/^[A-Z0-9_-]+$/, "Mã nhân sự chỉ chứa chữ in hoa, số hoặc gạch ngang (VD: SDG-018)"),
  username: z
    .string()
    .trim()
    .min(3, "Tên tài khoản tối thiểu 3 ký tự")
    .max(100, "Tên tài khoản tối đa 100 ký tự")
    .regex(/^[a-z0-9_.-]+$/, "Tên tài khoản viết thường không dấu (VD: trangdtt, duongnm)"),
  password: z
    .string()
    .min(6, "Mật khẩu khởi tạo tối thiểu 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
  position: z.string().trim().max(100, "Chức vụ tối đa 100 ký tự").optional().nullable(),
  departmentId: z.coerce.number().int().positive("Vui lòng chọn phòng ban hợp lệ").optional().nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s().-]{8,20}$/, "Số điện thoại không hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Email không đúng định dạng")
    .optional()
    .nullable()
    .or(z.literal("")),
  dateOfBirth: z.string().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  roleIds: z.array(z.coerce.number().int()).min(1, "Phải chọn ít nhất 1 vai trò cho nhân sự"),
  primaryRoleId: z.coerce.number().int().optional().nullable(),
});

export const UpdateEmployeeSchema = z.object({
  id: z.coerce.number().int().positive("ID nhân sự không hợp lệ"),
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(255, "Họ và tên tối đa 255 ký tự"),
  employeeCode: z
    .string()
    .trim()
    .min(3, "Mã nhân sự tối thiểu 3 ký tự")
    .max(50, "Mã nhân sự tối đa 50 ký tự"),
  position: z.string().trim().max(100, "Chức vụ tối đa 100 ký tự").optional().nullable(),
  departmentId: z.coerce.number().int().positive("Vui lòng chọn phòng ban hợp lệ").optional().nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s().-]{8,20}$/, "Số điện thoại không hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Email không đúng định dạng")
    .optional()
    .nullable()
    .or(z.literal("")),
  dateOfBirth: z.string().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.coerce.number().int()).min(1, "Phải chọn ít nhất 1 vai trò cho nhân sự"),
  primaryRoleId: z.coerce.number().int().optional().nullable(),
});

export const ResetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive("ID nhân sự không hợp lệ"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự").max(100, "Mật khẩu tối đa 100 ký tự"),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
