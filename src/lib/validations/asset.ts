import { z } from "zod";
import { validAssetDate } from "@/lib/asset-depreciation";

const id = z.number({ required_error: "Vui lòng chọn", invalid_type_error: "Lựa chọn không hợp lệ" }).int().positive("Vui lòng chọn");
const name = z.string().trim().min(1, "Nhập tên").max(255, "Tối đa 255 ký tự");
const optionalText = (max: number) => z.string().trim().max(max, `Tối đa ${max.toLocaleString("vi-VN")} ký tự`).nullable().optional().transform((v) => v || null);
const versionFields = { id: id.optional(), version: z.string().datetime().optional() };
const optionalDate = z.string().refine(validAssetDate, "Nhập ngày hợp lệ").nullable().optional();
export const assetFinanceFields = {
  purchaseDate: optionalDate,
  purchasePrice: z.string().regex(/^\d{1,18}$/, "Giá mua là số nguyên VND không âm, tối đa 18 chữ số").nullable().optional(),
  depreciationMonths: z.number({ invalid_type_error: "Nhập số tháng" }).int("Số tháng phải là số nguyên").min(1, "Tối thiểu 1 tháng").max(1200, "Tối đa 1.200 tháng").nullable().optional(),
  warrantyUntil: optionalDate,
};
function checkVersion(value: { id?: number; version?: string }, ctx: z.RefinementCtx) {
  if (Boolean(value.id) !== Boolean(value.version))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["version"], message: "Tải lại hồ sơ trước khi sửa." });
}

export const SaveAssetCategorySchema = z.object({
  ...versionFields,
  code: z.string().trim().min(1, "Nhập mã loại").max(50, "Tối đa 50 ký tự").regex(/^[A-Z][A-Z0-9_]*$/, "Mã loại dùng chữ IN HOA, số và gạch dưới"),
  name,
  description: optionalText(2000),
  active: z.boolean().default(true),
  defaultDepreciationMonths: assetFinanceFields.depreciationMonths,
}).strict().superRefine(checkVersion);

export const SaveAssetSchema = z.object({
  ...versionFields,
  name,
  categoryId: id,
  condition: z.enum(["CHUA_XAC_NHAN", "BINH_THUONG", "HONG", "DANG_SUA", "NGUNG_SU_DUNG"]).default("CHUA_XAC_NHAN"),
  usage: z.enum(["CHUA_XAC_DINH", "CA_NHAN", "DUNG_CHUNG", "CHUA_PHAN_BO"]).default("CHUA_XAC_DINH"),
  departmentId: id.nullable().default(null),
  employeeId: id.nullable().default(null),
  locationId: id.nullable().default(null),
  serial: optionalText(255),
  model: optionalText(255),
  notes: optionalText(4000),
  ...assetFinanceFields,
}).strict().superRefine((v, ctx) => {
  checkVersion(v, ctx);
  if (v.purchaseDate && v.warrantyUntil && v.warrantyUntil < v.purchaseDate)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["warrantyUntil"], message: "Hạn bảo hành không được trước ngày mua" });
  if ((v.usage === "CA_NHAN") !== (v.employeeId !== null))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["employeeId"], message: v.usage === "CA_NHAN" ? "Chọn người sử dụng" : "Chỉ gắn người khi sử dụng cá nhân" });
});

export const AssetQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  categoryId: id.optional(),
  condition: z.enum(["CHUA_XAC_NHAN", "BINH_THUONG", "HONG", "DANG_SUA", "NGUNG_SU_DUNG"]).optional(),
  usage: z.enum(["CHUA_XAC_DINH", "CA_NHAN", "DUNG_CHUNG", "CHUA_PHAN_BO"]).optional(),
  departmentId: id.optional(),
  employeeId: id.optional(),
  locationId: id.nullable().optional(),
  page: z.number().int().min(1).max(1000000).default(1),
}).strict();
export type AssetQuery = z.input<typeof AssetQuerySchema>;

export const AssignAssetLocationSchema = z.object({
  assetId: id,
  locationId: id.nullable(),
  version: z.string().datetime(),
  confirmMove: z.boolean().default(false),
}).strict();

export const AssetLocationQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  page: z.number().int().min(1).max(1000000).default(1),
}).strict();
