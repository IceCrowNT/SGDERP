import type { AiSupportDraft } from "./ai-support-task";
import { z } from "zod";
import { SaveAssetSchema } from "@/lib/validations/asset";
import { LocationFormSchema } from "@/lib/validations/location";
import type { AssetRow, AssetCategory } from "@/components/assets/types";
import type { LocationRow } from "@/lib/location-tree";
import type { AiInventoryDraft } from "@/lib/ai-inventory-tools";

const id = z.number().int().positive();
export const AssetDraftSchema = z.object({
  assetId: id.nullable(),
  changes: SaveAssetSchema.innerType().omit({ id: true, version: true }).partial().strict()
    .refine(v => Object.keys(v).length > 0, "Cần ít nhất một trường thay đổi."),
}).strict();
export const LocationDraftSchema = z.object({
  locationId: id.nullable(),
  changes: LocationFormSchema.partial().strict()
    .refine(v => Object.keys(v).length > 0, "Cần ít nhất một trường thay đổi."),
}).strict();
export const AssetSearchSchema = z.object({
  search: z.string().trim().max(120).optional(),
  categoryId: id.optional(),
  locationId: id.optional(),
  departmentId: id.optional(),
  page: z.number().int().min(1).max(1000).default(1),
}).strict();
export const LookupSchema = z.object({
  kind: z.enum(["categories", "locations", "departments", "people"]),
  search: z.string().trim().max(120).default(""),
}).strict();
export type AiChange = { label: string; before: string; after: string };
export type AiDraft = {
  kind: "asset"; values: z.input<typeof SaveAssetSchema>; row: AssetRow | null;
  categories: AssetCategory[]; changes: AiChange[];
} | {
  kind: "location"; values: z.infer<typeof LocationFormSchema>; row: LocationRow | null;
  rows: LocationRow[]; changes: AiChange[];
} | AiInventoryDraft | AiSupportDraft;

const string = { type: "string" }, number = { type: "integer", minimum: 1 };
const nullableId = { type: ["integer", "null"], minimum: 1 };
const text = { type: ["string", "null"] };
const object = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const tool = (name: string, description: string, parameters: unknown) => ({ type: "function", name, description, parameters, strict: false });

export const AI_PILOT_TOOLS = [
  tool("plan_category_depreciation", "Lập bảng chờ duyệt khấu hao mặc định cho TẤT CẢ loại tài sản trong công ty, kể cả loại ngừng dùng. Không cập nhật các tài sản đã có. Chỉ dùng khi người dùng yêu cầu toàn bộ loại; 5 năm = 60 tháng. Server tự đọc đầy đủ danh mục, không cần lookup; không ghi thay đổi cho đến khi người dùng bấm duyệt.", object({ months: { type: "integer", minimum: 1, maximum: 1200 }, scope: { type: "string", enum: ["all_categories"] } }, ["months", "scope"])),
  tool("lookup", "Tìm danh mục theo tên không dấu: loại tài sản, vị trí có đường dẫn, phòng quản lý hoặc người dùng thiết bị. Tối đa 50 kết quả, thu hẹp tên khi còn nhiều.", object({ kind: { type: "string", enum: ["categories", "locations", "departments", "people"] }, search: string }, ["kind"])),
  tool("search_assets", "Tra tài sản; locationId bao gồm vị trí con. departmentId là phòng quản lý, độc lập với vị trí. 20 hồ sơ/trang.", object({ search: string, categoryId: number, locationId: number, departmentId: number, page: number })),
  tool("get_asset", "Đọc hồ sơ tài sản hiện hành trước khi đề xuất sửa.", object({ id: number }, ["id"])),
  tool("prepare_asset", "Chuẩn bị form thêm/sửa một tài sản. KHÔNG lưu. assetId null để tạo; changes chỉ chứa trường được yêu cầu. Thiếu tên/loại khi tạo thì hỏi rõ. ID từ danh mục thật.", object({ assetId: nullableId, changes: object({
    name: string, categoryId: number,
    condition: { type: "string", enum: ["CHUA_XAC_NHAN", "BINH_THUONG", "HONG", "DANG_SUA", "NGUNG_SU_DUNG"] },
    usage: { type: "string", enum: ["CHUA_XAC_DINH", "CA_NHAN", "DUNG_CHUNG", "CHUA_PHAN_BO"] },
    departmentId: nullableId, employeeId: nullableId, locationId: nullableId,
    serial: text, model: text, notes: text, purchaseDate: { ...text, description: "YYYY-MM-DD hoặc null" },
    purchasePrice: { ...text, description: "Số nguyên VND dưới dạng chuỗi, hoặc null" },
    depreciationMonths: nullableId, warrantyUntil: { ...text, description: "YYYY-MM-DD hoặc null" },
  }) }, ["assetId", "changes"])),
  tool("prepare_location", "Chuẩn bị form thêm/sửa một vị trí, không lưu. locationId null để tạo. Khi tạo cần tên và loại; parentId null là gốc. Khi sửa chỉ truyền trường được yêu cầu.", object({ locationId: nullableId, changes: object({
    name: string, type: { type: "string", enum: ["TOA_NHA", "TANG", "PHONG", "KHU_VUC", "CHO_NGOI", "DIEM_DAT_THIET_BI"] },
    parentId: nullableId, description: string, active: { type: "boolean" },
  }) }, ["locationId", "changes"])),
];
