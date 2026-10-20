import { z } from "zod";

export const CreateDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Tên phòng ban phải có ít nhất 2 ký tự").max(255, "Tên phòng ban tối đa 255 ký tự"),
  code: z
    .string()
    .trim()
    .min(2, "Mã phòng ban phải có ít nhất 2 ký tự")
    .max(50, "Mã phòng ban tối đa 50 ký tự")
    .regex(/^[A-Z0-9_-]+$/, "Mã phòng ban chỉ chứa chữ in hoa, số, gạch dưới hoặc gạch nối (VD: HCNS, KD_SM)"),
  description: z.string().trim().max(1000, "Mô tả tối đa 1000 ký tự").optional().nullable(),
  parentId: z.coerce.number().int().positive("Phòng ban cha không hợp lệ").optional().nullable(),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.extend({
  id: z.coerce.number().int().positive("ID phòng ban không hợp lệ"),
});

export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;
