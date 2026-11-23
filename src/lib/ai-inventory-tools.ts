import { z } from "zod";
import { InventoryItemSchema, InventoryTransactionSchema, InventoryQuerySchema, INVENTORY_OPERATIONS } from "@/lib/validations/inventory";
import type { InventoryDetail, InventoryItem, InventoryOptions } from "@/components/inventory/types";
import type { AiChange } from "@/lib/ai-pilot-tools";

const id = z.number().int().positive().max(2147483647);
export const InventoryLookupSchema = z.object({ kind: z.enum(["categories", "departments", "people", "locations"]), search: z.string().trim().max(120).default("") }).strict();
export const InventoryDetailSchema = z.object({ id, page: z.number().int().min(1).max(1000000).default(1) }).strict();
export const InventorySearchSchema = InventoryQuerySchema;
export const InventoryItemDraftSchema = z.object({ itemId: id.nullable(), changes: InventoryItemSchema.innerType().omit({ id: true, version: true, initialRequestId: true }).partial().strict().refine(v => Object.keys(v).length > 0) }).strict();
export const InventoryTransactionDraftSchema = InventoryTransactionSchema.innerType().omit({ requestId: true, expected: true });
export type AiInventoryDraft = {
  kind: "inventory-item"; row: InventoryItem | null; values: z.infer<typeof InventoryItemSchema>;
  inventoryKind: "TIEU_HAO" | "PHU_KIEN"; options: InventoryOptions; recorded: boolean; changes: AiChange[];
} | {
  kind: "inventory-transaction"; row: InventoryItem; values: z.infer<typeof InventoryTransactionSchema>;
  detail: InventoryDetail; options: InventoryOptions; changes: AiChange[];
};

const string = { type: "string" }, number = { type: "integer", minimum: 1 }, nullableId = { type: ["integer", "null"], minimum: 1 };
const object = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const tool = (name: string, description: string, parameters: unknown) => ({ type: "function", name, description, parameters, strict: false });
export const AI_INVENTORY_TOOLS = [
  tool("prepare_inventory_receipt", "Lập bảng Ghi nhận hàng vừa mua, tối đa 20 mặt hàng, CHƯA đổi tồn. Ưu tiên dùng khi mua/nhập thêm hàng kể cả chưa có loại hoặc mặt hàng: bảng sẽ tạo loại/mặt hàng thiếu và NHAP nguyên tử sau một lần người dùng duyệt. Tra mặt hàng/loại trước, tái sử dụng loại phù hợp, không tạo loại riêng cho từng quy cách. itemId null nếu tạo mới, phải có name và unit; nếu đã có dùng ID thật, name/unit có thể để rỗng. Không đoán quy cách, giá hay nơi giữ. categoryId hoặc newCategoryName; thiếu cả hai vẫn lập bảng để người dùng chọn. locationId null nếu chưa biết, người dùng chọn trong bảng; TIEU_HAO luôn null. Giá chưa biết để null. Các trường không áp dụng để rỗng/null.", object({ rows: { type: "array", minItems: 1, maxItems: 20, items: object({ itemId: nullableId, name: string, unit: string, kind: { type: "string", enum: ["TIEU_HAO", "PHU_KIEN"] }, categoryId: nullableId, newCategoryName: string, quantity: number, locationId: nullableId, price: { type: ["string", "null"], description: "Đơn giá nguyên VND, chưa biết để null" }, notes: string }, ["itemId", "name", "unit", "kind", "categoryId", "newCategoryName", "quantity", "locationId", "price", "notes"]) } }, ["rows"])),
  tool("search_inventory", "Tra mặt hàng vật tư, số lượng tồn và đang cấp; kind TIEU_HAO là tiêu hao tồn chung, PHU_KIEN là phụ kiện theo nơi giữ. low=true lọc tồn thấp; showInactive=true gồm mặt hàng ngừng dùng. 20 dòng/trang. Không coi chưa ghi nhận tồn là hết hàng.", object({ kind: { type: "string", enum: ["TIEU_HAO", "PHU_KIEN"] }, search: string, categoryId: number, departmentId: number, locationId: number, low: { type: "boolean" }, showInactive: { type: "boolean" }, page: number }, ["kind"])),
  tool("get_inventory_item", "Đọc mặt hàng, tồn hiện tại và lịch sử giao dịch (20 dòng/trang), các lần cấp còn số dư. Luôn đọc trước khi chuẩn bị thay đổi. Mã giao dịch dùng issueId/reversalId lấy từ lịch sử thật.", object({ id: number, page: number }, ["id"])),
  tool("lookup_inventory", "Tra danh mục vật tư, người/phòng nhận hoặc nơi giữ theo tên. Tối đa 50 kết quả; không tự đoán ID. Người nhận chỉ có khi tài khoản được quản lý vật tư.", object({ kind: { type: "string", enum: ["categories", "departments", "people", "locations"] }, search: string }, ["kind"])),
  tool("prepare_inventory_item", "Chuẩn bị thêm/sửa mặt hàng, KHÔNG LƯU. itemId null tạo mới, cần tên/loại/đơn vị. Thêm 15 hộp cho mặt hàng đã có phải dùng giao dịch NHAP, không tạo mặt hàng mới. initialQuantity chỉ cho tiêu hao mới; changes chỉ chứa trường người dùng yêu cầu.", object({ itemId: nullableId, changes: object({ name: string, categoryId: number, unit: string, minimum: { type: ["integer", "null"], minimum: 0 }, initialQuantity: { type: ["integer", "null"], minimum: 0 }, departmentId: nullableId, notes: string, active: { type: "boolean" } }) }, ["itemId", "changes"])),
  tool("prepare_inventory_transaction", "Chuẩn bị giao dịch chờ người dùng xác nhận bằng form, KHÔNG đổi tồn. NHAP nhập thêm; CAP_PHAT xuất dùng/cấp cho đúng một người hoặc phòng; TON_DAU ghi tồn đầu; điều chỉnh/đảo cần lý do. Tiêu hao dùng tồn chung: fromId/toId null. Phụ kiện cần nơi xuất/nhập theo thao tác. quantity=0 chỉ cho TON_DAU hoặc DAO_GIAO_DICH; đảo lấy số lượng gốc. Các ID phải từ công cụ tra cứu; trường không áp dụng để null.", object({ itemId: number, operation: { type: "string", enum: INVENTORY_OPERATIONS }, quantity: { type: "integer", minimum: 0 }, fromId: nullableId, toId: nullableId, employeeId: nullableId, departmentId: nullableId, issueId: nullableId, reversalId: nullableId, price: { type: ["string", "null"], description: "Đơn giá nguyên VND cho NHAP" }, reason: string, notes: string }, ["itemId", "operation", "quantity", "fromId", "toId", "employeeId", "departmentId", "issueId", "reversalId", "price", "reason", "notes"])),
];
