import { z } from "zod";
import type { InventoryReceiptWorkView } from "@/lib/ai-inventory-receipt";

export const CategoryWorkSchema = z.object({ months: z.number().int().min(1).max(1200), scope: z.literal("all_categories") }).strict();
export const WorkSnapshotSchema = z.object({
  schemaVersion: z.literal(1), months: z.number().int().min(1).max(1200),
  rows: z.array(z.object({ id: z.number().int().positive(), code: z.string(), name: z.string(), active: z.boolean(), before: z.number().int().nullable(), version: z.string().datetime() }).strict()).max(2000),
}).strict();
export const WorkStatusSchema = z.enum(["CHO_DUYET", "CAN_LAM_MOI", "DA_HUY", "HOAN_TAT", "KHONG_CAN_DOI"]);
export const WorkResultSchema = z.object({ changed: z.number().int().nonnegative(), unchanged: z.number().int().nonnegative() }).strict();
export type AiWorkBase = {
  id: number; version: number; status: z.infer<typeof WorkStatusSchema>;
  createdAt: string; approvedAt: string | null; updatedAt: string;
};
export type CategoryWorkView = AiWorkBase & {
  kind: "KHAU_HAO_LOAI";
  snapshot: z.infer<typeof WorkSnapshotSchema>; result: z.infer<typeof WorkResultSchema> | null;
};
export type AiWorkView = CategoryWorkView | InventoryReceiptWorkView;
export const workStatusLabels: Record<AiWorkView["status"], string> = {
  CHO_DUYET: "Chờ bạn duyệt", CAN_LAM_MOI: "Dữ liệu đã thay đổi", DA_HUY: "Đã hủy",
  HOAN_TAT: "Đã hoàn tất", KHONG_CAN_DOI: "Không cần thay đổi",
};
