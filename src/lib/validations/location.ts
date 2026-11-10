import { z } from "zod";
export const LOCATION_TYPES = {
  TOA_NHA: "Tòa nhà",
  TANG: "Tầng",
  PHONG: "Phòng",
  KHU_VUC: "Khu vực",
  CHO_NGOI: "Chỗ ngồi",
  DIEM_DAT_THIET_BI: "Điểm đặt thiết bị",
} as const;
const fields = {
  name: z
    .string({ required_error: "Nhập tên vị trí" })
    .trim()
    .min(1, "Nhập tên vị trí")
    .max(255, "Tối đa 255 ký tự"),
  type: z.enum(
    ["TOA_NHA", "TANG", "PHONG", "KHU_VUC", "CHO_NGOI", "DIEM_DAT_THIET_BI"],
    { required_error: "Chọn loại vị trí" },
  ),
  parentId: z.number().int().positive().nullable(),
  description: z.string().trim().max(2000, "Tối đa 2.000 ký tự"),
  active: z.boolean(),
};
export const LocationFormSchema = z.object(fields).strict();
export type LocationFormInput = z.infer<typeof LocationFormSchema>;
export const SaveLocationSchema = z
  .object({
    ...fields,
    id: z.number().int().positive().optional(),
    version: z.string().datetime().optional(),
    confirmMove: z.boolean().optional(),
  })
  .strict()
  .refine((v) => !v.id || Boolean(v.version), {
    message: "Thiếu phiên bản vị trí. Tải lại trang.",
    path: ["version"],
  });
export const DeleteLocationSchema = z
  .object({ id: z.number().int().positive(), version: z.string().datetime() })
  .strict();
