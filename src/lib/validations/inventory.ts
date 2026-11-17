import { z } from "zod";
const id = z.number({ invalid_type_error: "Chọn một giá trị", required_error: "Chọn một giá trị" }).int().positive("Chọn một giá trị").max(2147483647, "Lựa chọn không hợp lệ");
const text = (max: number) => z.string().trim().max(max, `Tối đa ${max} ký tự`);
const name = text(255).min(1, "Nhập tên");
const edit = { id: id.optional(), version: z.string().datetime().optional() };
function version(v: { id?: number; version?: string }, c: z.RefinementCtx) {
  if (Boolean(v.id) !== Boolean(v.version)) c.addIssue({ code: "custom", path: ["version"], message: "Tải lại thông tin trước khi sửa." });
}
export const InventoryKindSchema = z.enum(["TIEU_HAO", "PHU_KIEN"]);
export const InventoryCategorySchema = z.object({
  ...edit, code: text(50).regex(/^[A-Z][A-Z0-9_]*$/, "Mã dùng chữ IN HOA, số và gạch dưới"), name,
  kind: InventoryKindSchema, description: text(2000), active: z.boolean(),
}).strict().superRefine(version);
export const InventoryItemSchema = z.object({
  ...edit, name, categoryId: id, unit: text(50).min(1, "Nhập đơn vị tính"),
  minimum: z.number({ invalid_type_error: "Nhập số nguyên không âm" }).int().min(0).max(2147483647).nullable(),
  departmentId: id.nullable(), notes: text(4000), active: z.boolean(),
}).strict().superRefine(version);
export const INVENTORY_OPERATIONS = ["TON_DAU", "NHAP", "CAP_PHAT", "THU_HOI", "CHUYEN_NOI_GIU", "DIEU_CHINH_TANG", "DIEU_CHINH_GIAM", "GIAM_DANG_CAP", "DAO_GIAO_DICH"] as const;
export const InventoryTransactionSchema = z.object({
  itemId: id, operation: z.enum(INVENTORY_OPERATIONS), quantity: z.number({ invalid_type_error: "Nhập số lượng nguyên" }).int("Nhập số nguyên").min(0).max(2147483647),
  fromId: id.nullable(), toId: id.nullable(), employeeId: id.nullable(), departmentId: id.nullable(), issueId: id.nullable(), reversalId: id.nullable(),
  price: z.string().regex(/^\d{1,18}$/, "Giá nguyên VND không âm, tối đa 18 chữ số").nullable(),
  reason: text(2000), notes: text(4000), requestId: z.string().uuid(), expected: z.string().min(1).max(100),
}).strict().superRefine((v, c) => {
  const error = (path: string, message: string) => c.addIssue({ code: "custom", path: [path], message });
  const allowed: Record<string, string[]> = {
    TON_DAU: ["toId"], NHAP: ["toId", "price"], CAP_PHAT: ["fromId", "employeeId", "departmentId"],
    THU_HOI: ["issueId", "toId"], CHUYEN_NOI_GIU: ["fromId", "toId"], DIEU_CHINH_TANG: ["toId"], DIEU_CHINH_GIAM: ["fromId"], GIAM_DANG_CAP: ["issueId"], DAO_GIAO_DICH: ["reversalId"],
  };
  for (const field of ["fromId", "toId", "employeeId", "departmentId", "issueId", "reversalId", "price"] as const) {
    if (v[field] !== null && !allowed[v.operation].includes(field)) error(field, "Trường này không áp dụng cho thao tác đã chọn");
  }
  for (const field of allowed[v.operation].filter(f => !["employeeId", "departmentId", "price"].includes(f))) {
    if (v[field as keyof typeof v] === null) error(field, "Chọn một giá trị");
  }
  if (v.operation !== "TON_DAU" && v.operation !== "DAO_GIAO_DICH" && !v.quantity) error("quantity", "Số lượng phải lớn hơn 0");
  if (v.operation === "DAO_GIAO_DICH" && v.quantity !== 0) error("quantity", "Số lượng đảo được lấy từ giao dịch gốc");
  if (v.operation === "CAP_PHAT" && Number(v.employeeId !== null) + Number(v.departmentId !== null) !== 1) error("employeeId", "Chọn đúng một người hoặc một phòng nhận");
  if (v.operation === "CHUYEN_NOI_GIU" && v.fromId === v.toId) error("toId", "Nơi nhận phải khác nơi xuất");
  if (["TON_DAU", "DIEU_CHINH_TANG", "DIEU_CHINH_GIAM", "GIAM_DANG_CAP", "DAO_GIAO_DICH"].includes(v.operation) && !v.reason) error("reason", "Nhập lý do");
});
export const InventoryQuerySchema = z.object({
  kind: InventoryKindSchema, search: text(120).default(""), categoryId: id.optional(), departmentId: id.optional(), locationId: id.optional(),
  low: z.boolean().default(false), showInactive: z.boolean().default(false), page: z.number().int().min(1).max(1000000).default(1),
}).strict();
export type InventoryKind = z.infer<typeof InventoryKindSchema>;
export type InventoryCategoryInput = z.infer<typeof InventoryCategorySchema>;
export type InventoryItemInput = z.infer<typeof InventoryItemSchema>;
export type InventoryTransactionInput = z.infer<typeof InventoryTransactionSchema>;
export type InventoryQuery = z.input<typeof InventoryQuerySchema>;
