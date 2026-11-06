import { z } from "zod";

export const CreateDepartmentSchema = z.object({
  name: z.string({ required_error: "Vui lòng nhập tên phòng ban", invalid_type_error: "Vui lòng nhập tên phòng ban" }).trim().min(1, "Vui lòng nhập tên phòng ban").min(2, "Tên phòng ban phải có ít nhất 2 ký tự").max(255, "Tên phòng ban tối đa 255 ký tự"),
  code: z
    .string({ required_error: "Vui lòng nhập mã phòng ban", invalid_type_error: "Vui lòng nhập mã phòng ban" })
    .trim()
    .min(1, "Vui lòng nhập mã phòng ban")
    .min(2, "Mã phòng ban phải có ít nhất 2 ký tự")
    .max(50, "Mã phòng ban tối đa 50 ký tự")
    .regex(/^[A-Z0-9_-]+$/, "Mã phòng ban chỉ chứa chữ in hoa, số, gạch dưới hoặc gạch nối (VD: HCNS, KD_SM)"),
  description: z.string().trim().max(1000, "Mô tả tối đa 1000 ký tự").optional().nullable(),
  headEmployeeId: z.number().int().positive("Người phụ trách không hợp lệ").optional().nullable(),
  parentId: z.number().int().positive("Phòng ban cha không hợp lệ").optional().nullable(),
}).strict();

export const UpdateDepartmentSchema = CreateDepartmentSchema.extend({
  id: z.number().int().positive("ID phòng ban không hợp lệ"),
});

export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;
