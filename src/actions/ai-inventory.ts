"use server";

import { prepareInventoryReceiptWork } from "@/actions/ai-inventory-receipt";
import type { AiWorkView } from "@/lib/ai-work";
import { InventoryReceiptRequestSchema } from "@/lib/ai-inventory-receipt";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import { canUseAiChat } from "@/lib/ai-pilot";
import { getInventory, getInventoryDetail, getInventoryOptions } from "@/actions/inventory";
import { InventoryItemSchema, InventoryTransactionSchema } from "@/lib/validations/inventory";
import { INVENTORY_LABELS } from "@/lib/inventory";
import { normalizeSearchText } from "@/lib/search-text";
import { AI_INVENTORY_TOOLS, InventoryDetailSchema, InventoryItemDraftSchema, InventoryLookupSchema, InventorySearchSchema, InventoryTransactionDraftSchema, type AiInventoryDraft } from "@/lib/ai-inventory-tools";
import type { ChatTrace } from "@/lib/ai-chat";
import type { AiChange } from "@/lib/ai-pilot-tools";

export async function executeAiInventoryTool(name: string, input: unknown, requestId: string): Promise<{ output: unknown; trace: ChatTrace; draft?: AiInventoryDraft; work?: AiWorkView }> {
  z.string().refine(value => AI_INVENTORY_TOOLS.some(tool => tool.name === value)).parse(name);
  const session = await getSession();
  const trace: ChatTrace = { tool: name, filters: {}, references: [] };
  const fail = (error: string) => ({ output: { error }, trace: { ...trace, references: [] } });
  if (!session || !canUseAiChat(session) || !hasPermission(session, "INVENTORY", name.startsWith("prepare_") ? "MANAGE" : "VIEW")) return fail("Bạn chưa có quyền thực hiện thao tác vật tư này.");
  const ref = (kind: ChatTrace["references"][number]["kind"], ids: number[]) => { if (ids.length) trace.references.push({ kind, ids: [...new Set(ids)] }); };
  if (name === "search_inventory") {
    const v = InventorySearchSchema.parse(input), result = await getInventory(v);
    if (!result.success) return fail(result.message);
    trace.filters = { kind: v.kind, search: v.search, page: result.page, low: v.low, showInactive: v.showInactive,
      ...(v.categoryId ? { categoryId: v.categoryId } : {}), ...(v.departmentId ? { departmentId: v.departmentId } : {}),
      ...(v.kind === "PHU_KIEN" && v.locationId ? { locationId: v.locationId } : {}) };
    ref("inventoryItems", result.rows.map(r => r.id));
    trace.results = result.rows.map(r => ({ id: r.id, label: `${r.ten_mat_hang} · ${r.ma_mat_hang}`.slice(0, 160) }));
    return { output: { rows: result.rows, total: result.total, page: result.page, pages: result.pages }, trace };
  }
  if (name === "get_inventory_item") {
    const v = InventoryDetailSchema.parse(input), result = await getInventoryDetail(v.id, v.page);
    if (!result.success) return fail(result.message);
    ref("inventoryItems", [v.id]); trace.filters = { id: v.id, page: result.page };
    return { output: result, trace };
  }
  if (name === "prepare_inventory_receipt") {
    const request = InventoryReceiptRequestSchema.parse(input);
    const result = await prepareInventoryReceiptWork({ ...request, requestId });
    if (!result.success) return fail(result.message);
    ref("inventoryItems", result.work.snapshot.rows.flatMap(r => r.itemId ? [r.itemId] : []));
    ref("inventoryCategories", result.work.snapshot.rows.flatMap(r => r.categoryId ? [r.categoryId] : []));
    ref("locations", result.work.snapshot.rows.flatMap(r => r.locationId ? [r.locationId] : []));
    return { output: { prepared: true, saved: false, ready: result.work.snapshot.ready }, trace, work: result.work };
  }
  const options = await getInventoryOptions();
  if (!options.success) return fail(options.message);
  if (name === "lookup_inventory") {
    const v = InventoryLookupSchema.parse(input);
    if (v.kind === "people" && !options.canManage) return fail("Tra người nhận cần quyền quản lý vật tư.");
    const rows = v.kind === "categories" ? options.categories.map(r => ({ id: r.id, name: r.ten_loai, code: r.ma_loai, kind: r.hang_muc, active: r.dang_su_dung }))
      : v.kind === "departments" ? options.departments.map(r => ({ id: r.id, name: r.ten_phong_ban }))
      : v.kind === "people" ? options.employees.map(r => ({ id: r.id, name: r.ho_ten, code: r.ma_nhan_su })) : options.locations.map(r => ({ id: r.id, name: r.path, active: r.active }));
    const terms = normalizeSearchText(v.search).split(/\s+/).filter(Boolean);
    const matched = rows.filter(row => terms.every(t => normalizeSearchText(`${row.name} ${"code" in row ? row.code : ""}`).includes(t)));
    const listed = matched.slice(0, 50);
    ref(v.kind === "categories" ? "inventoryCategories" : v.kind, listed.map(r => r.id));
    trace.filters = { kind: v.kind, search: v.search }; trace.results = listed.map(r => ({ id: r.id, label: r.name.slice(0, 160) }));
    return { output: { rows: listed, total: matched.length, truncated: matched.length > 50 }, trace };
  }
  z.string().uuid().parse(requestId);
  const label = (id: number | null | undefined, rows: { id: number; name: string }[]) => id == null ? "Chưa chọn" : rows.find(r => r.id === id)?.name ?? "Không hợp lệ";
  if (name === "prepare_inventory_item") {
    const v = InventoryItemDraftSchema.parse(input);
    const detail = v.itemId ? await getInventoryDetail(v.itemId) : null;
    if (detail && !detail.success) return fail(detail.message);
    const row = detail?.success ? detail.row : null;
    const before = row ? { id: row.id, version: row.updated_at.toISOString(), name: row.ten_mat_hang, categoryId: row.loai_vat_tu_id, unit: row.don_vi_tinh, minimum: row.muc_ton_toi_thieu, departmentId: row.phong_quan_ly_id, notes: row.ghi_chu ?? "", active: row.dang_su_dung } : { minimum: null, departmentId: null, notes: "", active: true, initialRequestId: requestId };
    const parsed = InventoryItemSchema.safeParse({ ...before, ...v.changes });
    if (!parsed.success) return { ...fail("Thiếu hoặc sai thông tin mặt hàng; cần tên, loại và đơn vị tính."), output: { error: "Kiểm tra thông tin mặt hàng.", fields: parsed.error.flatten().fieldErrors } };
    const values = parsed.data, category = options.categories.find(r => r.id === values.categoryId);
    if (!category || (!row && !category.dang_su_dung) || (values.departmentId && !options.departments.some(r => r.id === values.departmentId))) return fail("Loại hoặc phòng quản lý không hợp lệ. Hãy tra lại danh mục.");
    if (row && category.hang_muc !== row.loai_vat_tu.hang_muc) return fail("Không đổi mặt hàng giữa tiêu hao và phụ kiện. Hãy chọn loại cùng hạng mục.");
    if (values.initialQuantity != null && category.hang_muc !== "TIEU_HAO") return fail("Số lượng ban đầu tại đây chỉ dùng cho tiêu hao; phụ kiện cần tạo mặt hàng rồi ghi nhận tồn tại nơi giữ.");
    if (detail?.success && detail.recorded && values.unit !== row!.don_vi_tinh) return fail("Mặt hàng đã có giao dịch, không đổi đơn vị tính.");
    const labels: Record<string, string> = { name: "Tên mặt hàng", categoryId: "Loại", unit: "Đơn vị", minimum: "Tồn tối thiểu", departmentId: "Phòng quản lý", notes: "Ghi chú", active: "Đang sử dụng", initialQuantity: "Số lượng ban đầu" };
    const format = (key: string, value: unknown) => key === "categoryId" ? label(value as number, options.categories.map(r => ({ id: r.id, name: r.ten_loai }))) : key === "departmentId" ? label(value as number, options.departments.map(r => ({ id: r.id, name: r.ten_phong_ban }))) : value == null || value === "" ? "Chưa có" : typeof value === "boolean" ? value ? "Có" : "Không" : String(value);
    const changes: AiChange[] = Object.keys(v.changes).map(key => ({ label: labels[key], before: format(key, before[key as keyof typeof before]), after: format(key, values[key as keyof typeof values]) }));
    if (row) ref("inventoryItems", [row.id]); ref("inventoryCategories", [category.id]); if (values.departmentId) ref("departments", [values.departmentId]);
    return { output: { prepared: true, saved: false }, trace, draft: { kind: "inventory-item", row, values, inventoryKind: category.hang_muc, options, recorded: detail?.success ? detail.recorded : false, changes } };
  }
  if (name === "prepare_inventory_transaction") {
    const v = InventoryTransactionDraftSchema.parse(input);
    let detail = await getInventoryDetail(v.itemId);
    if (!detail.success) return fail(detail.message);
    if (v.reversalId && !detail.history.some(r => r.id === v.reversalId)) {
      const original = await db.giao_dich_vat_tu.findFirst({ where: { id: v.reversalId, company_id: session.companyId, mat_hang_vat_tu_id: v.itemId }, select: { id: true } });
      if (!original) return fail("Không tìm thấy giao dịch gốc của mặt hàng.");
      const newer = await db.giao_dich_vat_tu.count({ where: { company_id: session.companyId, mat_hang_vat_tu_id: v.itemId, id: { gt: original.id } } });
      detail = await getInventoryDetail(v.itemId, Math.floor(newer / 20) + 1);
      if (!detail.success) return fail(detail.message);
    }
    const parsed = InventoryTransactionSchema.safeParse({ ...v, requestId, expected: detail.expected });
    if (!parsed.success) return { ...fail("Thông tin giao dịch chưa hợp lệ."), output: { error: "Thông tin giao dịch chưa hợp lệ.", fields: parsed.error.flatten().fieldErrors } };
    const values = parsed.data, pooled = detail.row.loai_vat_tu.hang_muc === "TIEU_HAO";
    const needFrom = ["CAP_PHAT", "CHUYEN_NOI_GIU", "DIEU_CHINH_GIAM"].includes(v.operation), needTo = ["TON_DAU", "NHAP", "THU_HOI", "CHUYEN_NOI_GIU", "DIEU_CHINH_TANG"].includes(v.operation);
    if (pooled && (v.fromId || v.toId || ["THU_HOI", "CHUYEN_NOI_GIU", "GIAM_DANG_CAP"].includes(v.operation))) return fail("Tiêu hao dùng tồn chung; không chọn nơi giữ hoặc thu hồi.");
    if (!pooled && ((needFrom && !v.fromId) || (needTo && !v.toId))) return fail("Chọn nơi xuất/nhập cho phụ kiện.");
    if ((v.employeeId && !options.employees.some(r => r.id === v.employeeId)) || (v.departmentId && !options.departments.some(r => r.id === v.departmentId)) || [v.fromId, v.toId].some(id => id && !options.locations.some(r => r.id === id))) return fail("Người nhận, phòng hoặc nơi giữ không hợp lệ.");
    const source = detail.stock.find(r => r.locationId === v.fromId)?.quantity ?? 0, destination = detail.stock.find(r => r.locationId === v.toId)?.quantity ?? 0;
    if (needFrom && source < v.quantity) return fail(`Không đủ tồn: còn ${source} ${detail.row.don_vi_tinh}, yêu cầu ${v.quantity}.`);
    const issue = detail.issues.find(r => r.id === v.issueId), original = detail.history.find(r => r.id === v.reversalId);
    if (v.issueId && (!issue || issue.remaining < v.quantity)) return fail("Lần cấp không hợp lệ hoặc số thu hồi/ghi giảm vượt số đang giữ.");
    if (v.reversalId && (!original || original.loai_giao_dich === "DAO_GIAO_DICH" || original.danh_sach_dao.length)) return fail("Giao dịch gốc không hợp lệ hoặc đã được đảo.");
    const changes: AiChange[] = [{ label: "Mặt hàng", before: detail.row.ma_mat_hang, after: detail.row.ten_mat_hang }, { label: "Thao tác", before: "Chưa ghi nhận", after: INVENTORY_LABELS[v.operation] }, { label: "Số lượng", before: "—", after: `${original?.so_luong ?? v.quantity} ${detail.row.don_vi_tinh}` }];
    if (needFrom) changes.push({ label: pooled ? "Tồn chung" : `Tồn nơi xuất: ${label(v.fromId, options.locations)}`, before: String(source), after: String(source - v.quantity) });
    if (needTo) changes.push({ label: pooled ? "Tồn chung" : `Tồn nơi nhập: ${label(v.toId, options.locations)}`, before: String(destination), after: String(destination + v.quantity) });
    if (issue) {
      changes.push({ label: "Người/phòng đang giữ", before: "—", after: issue.nhan_su_nhan?.ho_ten ?? issue.phong_ban_nhan?.ten_phong_ban ?? "Chưa xác định" });
      changes.push({ label: "Đang giữ của lần cấp", before: String(issue.remaining), after: String(issue.remaining - v.quantity) });
    }
    if (original) {
      const operation = original.loai_giao_dich, quantity = original.so_luong;
      changes.push({ label: "Giao dịch gốc", before: INVENTORY_LABELS[operation], after: "Đảo toàn bộ tác động" });
      if (operation === "CAP_PHAT" && await db.giao_dich_vat_tu.count({ where: { company_id: session.companyId, mat_hang_vat_tu_id: v.itemId, cap_phat_goc_id: original.id, loai_giao_dich: { not: "DAO_GIAO_DICH" }, danh_sach_dao: { none: {} } } })) return fail("Hãy đảo các lần thu hồi hoặc ghi giảm còn hiệu lực trước khi đảo lần cấp.");
      const effects: { locationId: number | null; delta: number }[] = [];
      if (["CAP_PHAT", "CHUYEN_NOI_GIU", "DIEU_CHINH_GIAM"].includes(operation)) effects.push({ locationId: pooled ? null : original.vi_tri_xuat_id, delta: quantity });
      if (["TON_DAU", "NHAP", "THU_HOI", "CHUYEN_NOI_GIU", "DIEU_CHINH_TANG"].includes(operation)) effects.push({ locationId: pooled ? null : original.vi_tri_nhap_id, delta: -quantity });
      for (const effect of effects) {
        const before = detail.stock.find(r => r.locationId === effect.locationId)?.quantity ?? 0;
        if (before + effect.delta < 0) return fail("Không thể đảo: số lượng tồn hiện tại không đủ để hoàn tác giao dịch gốc.");
        changes.push({ label: pooled ? "Tồn chung" : `Tồn tại: ${label(effect.locationId, options.locations)}`, before: String(before), after: String(before + effect.delta) });
      }
      if (!pooled && ["CAP_PHAT", "THU_HOI", "GIAM_DANG_CAP"].includes(operation)) {
        const issueId = operation === "CAP_PHAT" ? original.id : original.cap_phat_goc_id;
        const before = detail.issues.find(r => r.id === issueId)?.remaining ?? 0;
        const after = before + (operation === "CAP_PHAT" ? -quantity : quantity);
        if (after < 0) return fail("Không thể đảo: số đang giữ đã thay đổi. Hãy kiểm tra các lần thu hồi hoặc ghi giảm.");
        changes.push({ label: "Đang giữ của lần cấp", before: String(before), after: String(after) });
      }
      if (original.nhan_su_nhan || original.phong_ban_nhan) changes.push({ label: "Người/phòng nhận gốc", before: "—", after: original.nhan_su_nhan?.ho_ten ?? original.phong_ban_nhan!.ten_phong_ban });
    }
    if (v.employeeId || v.departmentId) changes.push({ label: "Người/phòng nhận", before: "—", after: v.employeeId ? label(v.employeeId, options.employees.map(r => ({ id: r.id, name: r.ho_ten }))) : label(v.departmentId, options.departments.map(r => ({ id: r.id, name: r.ten_phong_ban }))) });
    if (v.reason) changes.push({ label: "Lý do", before: "—", after: v.reason });
    ref("inventoryItems", [v.itemId]);
    return { output: { prepared: true, saved: false }, trace, draft: { kind: "inventory-transaction", row: detail.row, values, detail, options, changes } };
  }
  return fail("Công cụ vật tư chưa được hỗ trợ.");
}
