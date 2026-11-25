"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma, type cong_viec_ai } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hasPermission, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { canUseAiChat } from "@/lib/ai-pilot";
import { isAvailableAssetLocation } from "@/lib/asset-location";
import { locationPath } from "@/lib/location-tree";
import { InventoryCategorySchema, InventoryItemSchema, InventoryTransactionSchema } from "@/lib/validations/inventory";
import { InventoryReceiptRequestSchema, InventoryReceiptSnapshotSchema, InventoryReceiptResultSchema, type InventoryReceiptRequest } from "@/lib/ai-inventory-receipt";
import { inventoryReceiptView } from "@/lib/ai-inventory-receipt";

class ReceiptError extends Error {}
const identity = z.object({ id: z.number().int().positive(), version: z.number().int().positive() }).strict();
const key = (s: string) => s.trim().toLocaleLowerCase("vi");
const owned = (s: SessionUser) => ({ company_id: s.companyId, account_id: s.userId });
function failure(e: unknown) {
  return { success: false as const, message: e instanceof ReceiptError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : "Chưa ghi nhận hàng. Hãy tải trạng thái, kiểm tra quyền và thử lại." };
}
async function actor() {
  const s = await getSession();
  if (!s || !canUseAiChat(s) || !hasPermission(s, "INVENTORY", "MANAGE")) throw new ReceiptError("Bạn cần quyền quản lý vật tư để thực hiện công việc này.");
  return s;
}
async function lock(tx: Prisma.TransactionClient, s: SessionUser) {
  await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id=${s.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126,${s.companyId}::int)`;
  const current = await currentActor(tx, s, "INVENTORY");
  if (!canUseAiChat({ ...s, permissions: current.permissions })) throw new ReceiptError("Quyền trợ lý AI đã thay đổi.");
}
async function audit(tx: Prisma.TransactionClient, s: SessionUser, kind: string, id: number, action: string, data: unknown) {
  await tx.nhat_ky_hoat_dong.create({ data: { ...owned(s), ten_dang_nhap: s.username, ho_ten: s.fullName,
    phan_he: kind === "cong_viec_ai" ? "AI" : "INVENTORY", hanh_dong: action, doi_tuong_id: `${kind}:${id}`,
    mo_ta: "Ghi nhận hàng vừa mua qua bảng duyệt AI", du_lieu_moi: JSON.parse(JSON.stringify(data)) } });
}
async function snapshot(tx: Prisma.TransactionClient, s: SessionUser, input: InventoryReceiptRequest) {
  const categories = await tx.loai_vat_tu.findMany({ where: { company_id: s.companyId } });
  const locations = await tx.vi_tri.findMany({ where: { company_id: s.companyId }, select: { id: true, parent_id: true, ten_vi_tri: true, loai_vi_tri: true, dang_su_dung: true, updated_at: true } });
  const rows = [], seen = new Set<string>();
  for (const line of input.rows) {
    const matches = await tx.mat_hang_vat_tu.findMany({ where: { company_id: s.companyId, ...(line.itemId ? { id: line.itemId } : { ten_mat_hang: { equals: line.name, mode: "insensitive" }, loai_vat_tu: { hang_muc: line.kind } }) }, include: { loai_vat_tu: true }, take: 2 });
    if (matches.length > 1) throw new ReceiptError(`Có nhiều mặt hàng tên “${line.name}”. Hãy chọn đúng mặt hàng trước khi lập bảng.`);
    const item = matches[0];
    if (line.itemId && !item) throw new ReceiptError("Không tìm thấy mặt hàng trong công ty.");
    if (item && (!item.dang_su_dung || !item.loai_vat_tu.dang_su_dung || item.loai_vat_tu.hang_muc !== line.kind)) throw new ReceiptError(`Mặt hàng “${item.ten_mat_hang}” ngừng dùng hoặc không đúng hạng mục.`);
    if (item && line.unit && key(line.unit) !== key(item.don_vi_tinh)) throw new ReceiptError(`“${item.ten_mat_hang}” đang dùng đơn vị ${item.don_vi_tinh}. Hãy xác nhận số lượng theo đơn vị này.`);
    if (item && !InventoryItemSchema.innerType().shape.unit.safeParse(item.don_vi_tinh).success) throw new ReceiptError(`Mặt hàng “${item.ten_mat_hang}” cần xác nhận lại đơn vị tính trước khi nhập.`);
    if (item && !line.itemId && line.categoryId && line.categoryId !== item.loai_vat_tu_id) throw new ReceiptError(`Tên “${item.ten_mat_hang}” đã có ở loại khác. Hãy chọn đúng mặt hàng hoặc làm rõ quy cách.`);
    const unique = item ? `id:${item.id}` : `${line.kind}:${key(line.name)}`;
    if (seen.has(unique)) throw new ReceiptError("Một mặt hàng đang xuất hiện nhiều lần. Hãy gộp số lượng trước khi lập bảng.");
    seen.add(unique);
    let category: typeof categories[number] | undefined = item?.loai_vat_tu;
    if (!category && line.categoryId) {
      category = categories.find(c => c.id === line.categoryId);
      if (!category) throw new ReceiptError("Loại vật tư không thuộc công ty hoặc đã bị xóa.");
    }
    if (!category && line.newCategoryName) {
      const found = categories.filter(c => c.hang_muc === line.kind && key(c.ten_loai) === key(line.newCategoryName));
      if (found.length > 1) throw new ReceiptError("Có nhiều loại cùng tên. Hãy chọn loại cụ thể.");
      category = found[0];
    }
    if (category && (!category.dang_su_dung || category.hang_muc !== line.kind)) throw new ReceiptError("Loại vật tư đã ngừng dùng hoặc không đúng hạng mục.");
    const issues: string[] = [];
    if (!category && !line.newCategoryName) issues.push("Chọn loại mặt hàng hoặc nhập tên loại mới.");
    if (line.kind === "PHU_KIEN" && !line.locationId) issues.push("Chọn nơi giữ phụ kiện.");
    const location = locations.find(l => l.id === line.locationId);
    if (line.locationId && (!location || !["PHONG", "KHU_VUC", "CHO_NGOI", "DIEM_DAT_THIET_BI"].includes(location.loai_vi_tri) || !isAvailableAssetLocation(line.locationId, locations))) throw new ReceiptError("Nơi giữ không hợp lệ hoặc đã ngừng dùng. Hãy chọn lại.");
    const path = location ? locationPath(location.id, locations) : line.kind === "TIEU_HAO" ? "Tồn chung" : "Chưa chọn";
    const ancestors = [];
    let ancestor = location;
    while (ancestor) { ancestors.push([ancestor.id, ancestor.updated_at.toISOString()]); ancestor = locations.find(l => l.id === ancestor!.parent_id); }
    const stock = item ? await tx.$queryRaw<{ vi_tri_id: number | null; so_luong: bigint }[]>`SELECT * FROM ton_vat_tu(${item.id}::int)` : [];
    const before = Number(stock.find(r => r.vi_tri_id === line.locationId)?.so_luong ?? 0);
    const last = item ? await tx.giao_dich_vat_tu.findFirst({ where: { company_id: s.companyId, mat_hang_vat_tu_id: item.id }, orderBy: { id: "desc" }, select: { id: true } }) : null;
    if (!Number.isSafeInteger(before + line.quantity) || before + line.quantity > 2147483647) throw new ReceiptError("Số lượng sau nhập vượt giới hạn. Hãy kiểm tra lại.");
    rows.push({ itemId: item?.id ?? null, name: item?.ten_mat_hang ?? line.name, unit: item?.don_vi_tinh ?? line.unit, kind: line.kind,
      categoryId: category?.id ?? null, categoryName: category?.ten_loai ?? line.newCategoryName, createCategory: !category && !!line.newCategoryName, createItem: !item,
      locationId: line.locationId, locationName: path, quantity: line.quantity, price: line.price, notes: line.notes, before, after: before + line.quantity,
      sourceVersion: JSON.stringify([item?.updated_at.toISOString() ?? null, category?.updated_at.toISOString() ?? null, last?.id ?? 0, ancestors]), issues });
  }
  return InventoryReceiptSnapshotSchema.parse({ schemaVersion: 1, input, ready: rows.every(r => !r.issues.length), rows });
}
async function apply(tx: Prisma.TransactionClient, s: SessionUser, workId: number, fresh: z.infer<typeof InventoryReceiptSnapshotSchema>) {
  const result: z.infer<typeof InventoryReceiptResultSchema> = { createdItems: 0, createdCategories: 0, rows: [] };
  const created = new Map<string, number>();
  for (const row of fresh.rows) {
    let categoryId = row.categoryId;
    if (!categoryId) {
      const categoryKey = `${row.kind}:${key(row.categoryName)}`;
      categoryId = created.get(categoryKey) ?? null;
      if (!categoryId) {
        const v = InventoryCategorySchema.parse({ code: `AI_${randomUUID().replaceAll("-", "").toUpperCase()}`, name: row.categoryName, kind: row.kind, description: "", active: true });
        const c = await tx.loai_vat_tu.create({ data: { company_id: s.companyId, ma_loai: v.code, ten_loai: v.name, hang_muc: v.kind, dang_su_dung: true } });
        categoryId = c.id; created.set(categoryKey, c.id); result.createdCategories++;
        await audit(tx, s, "loai_vat_tu", c.id, "CREATE", { ...c, cong_viec_ai_id: workId });
      }
    }
    let item = row.itemId ? await tx.mat_hang_vat_tu.findFirst({ where: { id: row.itemId, company_id: s.companyId } }) : null;
    if (!item) {
      const v = InventoryItemSchema.parse({ name: row.name, categoryId, unit: row.unit, minimum: null, departmentId: null, notes: "", active: true });
      item = await tx.mat_hang_vat_tu.create({ data: { company_id: s.companyId, ten_mat_hang: v.name, loai_vat_tu_id: v.categoryId, don_vi_tinh: v.unit, dang_su_dung: true } });
      result.createdItems++;
      await audit(tx, s, "mat_hang_vat_tu", item.id, "CREATE", { ...item, cong_viec_ai_id: workId });
    }
    const v = InventoryTransactionSchema.parse({ itemId: item.id, operation: "NHAP", quantity: row.quantity, fromId: null, toId: row.locationId, employeeId: null, departmentId: null, issueId: null, reversalId: null, price: row.price, reason: "", notes: row.notes, requestId: randomUUID(), expected: `work:${workId}` });
    const transaction = await tx.giao_dich_vat_tu.create({ data: { ...owned(s), mat_hang_vat_tu_id: item.id, loai_giao_dich: "NHAP", so_luong: v.quantity, vi_tri_nhap_id: v.toId, don_gia: v.price, ghi_chu: v.notes || null, request_id: v.requestId } });
    await audit(tx, s, "giao_dich_vat_tu", transaction.id, "CREATE", { ...transaction, cong_viec_ai_id: workId });
    result.rows.push({ itemId: item.id, transactionId: transaction.id, code: item.ma_mat_hang, name: row.name, unit: row.unit, kind: row.kind, quantity: row.quantity, locationId: row.locationId, locationName: row.locationName, before: row.before, after: row.after });
  }
  return InventoryReceiptResultSchema.parse(result);
}
export async function prepareInventoryReceiptWork(input: unknown) {
  try {
    const s = await actor(), { requestId, ...request } = InventoryReceiptRequestSchema.extend({ requestId: z.string().uuid() }).strict().parse(input);
    const work = await db.$transaction(async tx => {
      await lock(tx, s);
      const prior = await tx.cong_viec_ai.findFirst({ where: { ...owned(s), ma_yeu_cau: requestId } });
      if (prior) {
        if (prior.loai_cong_viec !== "NHAP_VAT_TU" || JSON.stringify(inventoryReceiptView(prior).snapshot.input) !== JSON.stringify(request)) throw new ReceiptError("Yêu cầu đã dùng cho nội dung khác.");
        return inventoryReceiptView(prior);
      }
      const data = await snapshot(tx, s, request);
      const row = await tx.cong_viec_ai.create({ data: { ...owned(s), ma_yeu_cau: requestId, loai_cong_viec: "NHAP_VAT_TU", trang_thai: "CHO_DUYET", noi_dung: data } });
      await audit(tx, s, "cong_viec_ai", row.id, "AI_WORK_PREPARE", { count: data.rows.length });
      return inventoryReceiptView(row);
    }, { timeout: 30000 });
    return { success: true as const, work };
  } catch (e) { return failure(e); }
}
async function mutate(input: unknown, operation: "approve" | "refresh" | "cancel" | "edit") {
  try {
    const s = await actor();
    const v = operation === "edit" ? identity.extend({ rows: InventoryReceiptRequestSchema.shape.rows }).parse(input) : identity.parse(input);
    const work = await db.$transaction(async tx => {
      await lock(tx, s);
      const row: cong_viec_ai | null = await tx.cong_viec_ai.findFirst({ where: { ...owned(s), id: v.id, loai_cong_viec: "NHAP_VAT_TU" } });
      if (!row) throw new ReceiptError("Không tìm thấy công việc của bạn.");
      const current = inventoryReceiptView(row);
      if (current.version !== v.version) throw new ReceiptError("Bảng đã thay đổi. Tải trạng thái và xem lại trước khi duyệt.");
      if ((operation === "approve" && current.status === "HOAN_TAT") || (operation === "cancel" && current.status === "DA_HUY")) return current;
      if (!["CHO_DUYET", "CAN_LAM_MOI"].includes(current.status)) throw new ReceiptError("Công việc đã kết thúc.");
      let data: Prisma.cong_viec_aiUpdateInput;
      if (operation === "cancel") data = { trang_thai: "DA_HUY" };
      else {
        const request = "rows" in v ? InventoryReceiptRequestSchema.parse({ rows: v.rows }) : current.snapshot.input;
        const fresh = await snapshot(tx, s, request);
        if (operation === "edit" || operation === "refresh") data = { noi_dung: fresh, phien_ban: { increment: 1 }, trang_thai: "CHO_DUYET" };
        else if (current.status !== "CHO_DUYET" || JSON.stringify(fresh) !== JSON.stringify(current.snapshot)) data = { trang_thai: "CAN_LAM_MOI" };
        else {
          if (!fresh.ready) throw new ReceiptError("Bổ sung loại mặt hàng hoặc nơi giữ còn thiếu trước khi xác nhận.");
          const result = await apply(tx, s, row.id, fresh);
          data = { trang_thai: "HOAN_TAT", thoi_diem_duyet: new Date(), ket_qua: result };
        }
      }
      const updated = await tx.cong_viec_ai.update({ where: { id: row.id }, data: { ...data, updated_at: new Date(Math.max(Date.now(), row.updated_at.getTime() + 1)) } });
      await audit(tx, s, "cong_viec_ai", row.id, `AI_WORK_${operation.toUpperCase()}`, { version: updated.phien_ban, status: updated.trang_thai });
      return inventoryReceiptView(updated);
    }, { timeout: 30000 });
    if (work.status === "HOAN_TAT") { revalidatePath("/inventory"); revalidatePath("/asset-management"); }
    return { success: true as const, work };
  } catch (e) { return failure(e); }
}
export async function mutateInventoryReceiptWork(input: unknown, operation: unknown) {
  const parsed = z.enum(["approve", "refresh", "cancel"]).safeParse(operation);
  return parsed.success ? mutate(input, parsed.data) : failure(new ReceiptError("Thao tác không hợp lệ."));
}
export async function updateInventoryReceiptWork(input: unknown) { return mutate(input, "edit"); }
