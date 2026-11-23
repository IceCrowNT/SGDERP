import { z } from "zod";
import { InventoryItemSchema, InventoryKindSchema, InventoryTransactionSchema } from "@/lib/validations/inventory";
import type { cong_viec_ai } from "@prisma/client";
import { WorkStatusSchema } from "@/lib/ai-work";
import type { AiWorkBase } from "@/lib/ai-work";

const id = z.number().int().positive().max(2147483647);
export const InventoryReceiptLineSchema = z.object({
  itemId: id.nullable(), name: z.string().trim().max(255, "Tên tối đa 255 ký tự"), unit: z.string().trim().max(50, "Đơn vị tối đa 50 ký tự"), kind: InventoryKindSchema,
  categoryId: id.nullable(), newCategoryName: z.string().trim().max(255, "Tên loại tối đa 255 ký tự"),
  quantity: z.number({ invalid_type_error: "Nhập số lượng nguyên", required_error: "Nhập số lượng" }).int("Nhập số lượng nguyên").min(1, "Số lượng phải lớn hơn 0").max(2147483647, "Số lượng vượt giới hạn"),
  locationId: id.nullable(), price: InventoryTransactionSchema.innerType().shape.price,
  notes: z.string().trim().max(4000, "Ghi chú tối đa 4.000 ký tự"),
}).strict().superRefine((v, ctx) => {
  if (v.itemId === null) {
    if (!v.name) ctx.addIssue({ code: "custom", path: ["name"], message: "Nhập tên và quy cách mặt hàng" });
    const unit = InventoryItemSchema.innerType().shape.unit.safeParse(v.unit);
    if (!unit.success) ctx.addIssue({ code: "custom", path: ["unit"], message: "Nhập đơn vị tính, ví dụ sợi, cái, hộp" });
  }
  if (v.kind === "TIEU_HAO" && v.locationId !== null) ctx.addIssue({ code: "custom", path: ["locationId"], message: "Tiêu hao dùng tồn chung, không chọn nơi giữ" });
  if (v.categoryId !== null && v.newCategoryName) ctx.addIssue({ code: "custom", path: ["newCategoryName"], message: "Chọn loại hiện có hoặc đề xuất loại mới" });
});
export const InventoryReceiptRequestSchema = z.object({ rows: z.array(InventoryReceiptLineSchema).min(1, "Cần ít nhất một mặt hàng").max(20, "Mỗi bảng tối đa 20 mặt hàng") }).strict();
export type InventoryReceiptRequest = z.infer<typeof InventoryReceiptRequestSchema>;
export const InventoryReceiptSnapshotSchema = z.object({
  schemaVersion: z.literal(1), input: InventoryReceiptRequestSchema, ready: z.boolean(),
  rows: z.array(z.object({
    itemId: id.nullable(), name: z.string(), unit: z.string(), kind: InventoryKindSchema,
    categoryId: id.nullable(), categoryName: z.string(), createCategory: z.boolean(), createItem: z.boolean(),
    locationId: id.nullable(), locationName: z.string(), quantity: z.number().int().positive(),
    price: z.string().nullable(), notes: z.string(), before: z.number().int().nonnegative(), after: z.number().int().nonnegative(),
    sourceVersion: z.string(), issues: z.array(z.string()),
  }).strict()).min(1).max(20),
}).strict();
export const InventoryReceiptResultSchema = z.object({
  createdItems: z.number().int().nonnegative(), createdCategories: z.number().int().nonnegative(),
  rows: z.array(z.object({ itemId: id, transactionId: id, code: z.string(), name: z.string(), unit: z.string(), kind: InventoryKindSchema,
    quantity: z.number().int().positive(), locationId: id.nullable(), locationName: z.string(), before: z.number().int().nonnegative(), after: z.number().int().nonnegative() }).strict()).min(1).max(20),
}).strict();
export type InventoryReceiptWorkView = AiWorkBase & {
  kind: "NHAP_VAT_TU";
  snapshot: z.infer<typeof InventoryReceiptSnapshotSchema>;
  result: z.infer<typeof InventoryReceiptResultSchema> | null;
};

export function inventoryReceiptView(row: cong_viec_ai): InventoryReceiptWorkView {
  if (row.loai_cong_viec !== "NHAP_VAT_TU") throw Error("Loại công việc không phù hợp.");
  return { kind: "NHAP_VAT_TU", id: row.id, version: row.phien_ban, status: WorkStatusSchema.parse(row.trang_thai),
    snapshot: InventoryReceiptSnapshotSchema.parse(row.noi_dung), result: row.ket_qua === null ? null : InventoryReceiptResultSchema.parse(row.ket_qua),
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), approvedAt: row.thoi_diem_duyet?.toISOString() ?? null };
}
