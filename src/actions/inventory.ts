"use server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hasPermission, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { normalizeSearchText } from "@/lib/search-text";
import { locationPath } from "@/lib/location-tree";
import { isAvailableAssetLocation } from "@/lib/asset-location";
import { inventoryDbMessage } from "@/lib/inventory";
import { InventoryCategorySchema, InventoryItemSchema, InventoryTransactionSchema, InventoryQuerySchema } from "@/lib/validations/inventory";

class InventoryError extends Error {}
const denied = () => ({ success: false as const, message: "Bạn chưa được cấp quyền vật tư phù hợp." });
function failure(e: unknown) {
  return { success: false as const, message: e instanceof InventoryError ? e.message : inventoryDbMessage(e) ??
    (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" ? "Mã hoặc yêu cầu đã tồn tại. Hãy kiểm tra lại." : "Không thể lưu. Nội dung đang nhập được giữ; hãy kiểm tra quyền và thử lại.") };
}
const categorySelect = { id: true, ma_loai: true, ten_loai: true, hang_muc: true, mo_ta: true, dang_su_dung: true, updated_at: true } as const;
const itemSelect = {
  id: true, ma_mat_hang: true, ten_mat_hang: true, loai_vat_tu_id: true, don_vi_tinh: true, muc_ton_toi_thieu: true,
  phong_quan_ly_id: true, ghi_chu: true, dang_su_dung: true, updated_at: true,
  loai_vat_tu: { select: categorySelect }, phong_quan_ly: { select: { id: true, ten_phong_ban: true } },
} as const;
const transactionSelect = {
  dong_vat_tu: { select: { ho_so: { select: { id: true, ma: true } } } },
  id: true, mat_hang_vat_tu_id: true, loai_giao_dich: true, so_luong: true, vi_tri_xuat_id: true, vi_tri_nhap_id: true,
  nhan_su_nhan_id: true, phong_ban_nhan_id: true, cap_phat_goc_id: true, dao_giao_dich_id: true, don_gia: true, ly_do: true, ghi_chu: true, created_at: true,
  vi_tri_xuat: { select: { ten_vi_tri: true } }, vi_tri_nhap: { select: { ten_vi_tri: true } },
  nhan_su_nhan: { select: { ho_ten: true } }, phong_ban_nhan: { select: { ten_phong_ban: true } },
  tai_khoan: { select: { ten_hien_thi: true } }, danh_sach_dao: { select: { id: true } },
} as const;
async function lock(tx: Prisma.TransactionClient, session: SessionUser, itemId?: number) {
  await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id=${session.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126,${session.companyId}::int)`;
  await currentActor(tx, session, "INVENTORY");
  if (itemId) await tx.$queryRaw`SELECT id FROM vat_tu.mat_hang_vat_tu WHERE id=${itemId} AND company_id=${session.companyId} FOR UPDATE`;
}
function assertVersion(before: { updated_at: Date } | null, id?: number, version?: string) {
  if (id && !before) throw new InventoryError("Không tìm thấy thông tin trong công ty.");
  if (before && before.updated_at.toISOString() !== version) throw new InventoryError("Thông tin đã thay đổi. Đóng và mở lại để xem bản mới trước khi sửa.");
}
async function audit(tx: Prisma.TransactionClient, s: SessionUser, kind: string, id: number, name: string, before: unknown, after: unknown) {
  await tx.nhat_ky_hoat_dong.create({ data: {
    company_id: s.companyId, account_id: s.userId, ten_dang_nhap: s.username, ho_ten: s.fullName,
    phan_he: "INVENTORY", doi_tuong_id: `${kind}:${id}`, ten_doi_tuong: name, hanh_dong: before ? "UPDATE" : "CREATE",
    mo_ta: `${before ? "Cập nhật" : "Ghi nhận"}: ${name}`, du_lieu_cu: before ? JSON.parse(JSON.stringify(before)) : Prisma.DbNull, du_lieu_moi: JSON.parse(JSON.stringify(after)),
  } });
}
async function snapshot(tx: Prisma.TransactionClient, item: { id: number; updated_at: Date }) {
  const last = await tx.giao_dich_vat_tu.findFirst({ where: { mat_hang_vat_tu_id: item.id }, orderBy: { id: "desc" }, select: { id: true } });
  return `${item.updated_at.toISOString()}:${last?.id ?? 0}`;
}
async function balances(tx: Prisma.TransactionClient, itemId: number) {
  const stock = await tx.$queryRaw<{ vi_tri_id: number | null; so_luong: bigint }[]>`SELECT * FROM ton_vat_tu(${itemId}::int)`;
  const issued = await tx.$queryRaw<{ cap_phat_id: number; so_luong: bigint }[]>`SELECT * FROM dang_cap_vat_tu(${itemId}::int)`;
  return { stock: stock.map(r => ({ locationId: r.vi_tri_id, quantity: Number(r.so_luong) })), issued: issued.map(r => ({ issueId: r.cap_phat_id, quantity: Number(r.so_luong) })) };
}
export async function getInventoryOptions() {
  const s = await getSession(); if (!s || !hasPermission(s, "INVENTORY")) return denied();
  const manage = hasPermission(s, "INVENTORY", "MANAGE");
  const [categories, locations, departments, employees] = await Promise.all([
    db.loai_vat_tu.findMany({ where: { company_id: s.companyId }, select: categorySelect, orderBy: { ten_loai: "asc" } }),
    db.vi_tri.findMany({ where: { company_id: s.companyId }, select: { id: true, parent_id: true, ten_vi_tri: true, loai_vi_tri: true, dang_su_dung: true }, orderBy: { ten_vi_tri: "asc" } }),
    db.phong_ban.findMany({ where: { company_id: s.companyId }, select: { id: true, ten_phong_ban: true }, orderBy: { ten_phong_ban: "asc" } }),
    manage ? db.nhan_su.findMany({ where: { company_id: s.companyId, tinh_trang_lam_viec: "ACTIVE" }, select: { id: true, ho_ten: true, ma_nhan_su: true }, orderBy: { ho_ten: "asc" } }) : Promise.resolve([]),
  ]);
  return { success: true as const, categories, departments, employees, locations: locations.filter(r => ["PHONG", "KHU_VUC", "CHO_NGOI", "DIEM_DAT_THIET_BI"].includes(r.loai_vi_tri)).map(r => ({ id: r.id, name: r.ten_vi_tri, path: locationPath(r.id, locations), active: isAvailableAssetLocation(r.id, locations) })), canManage: manage };
}
export async function getInventory(input: unknown) {
  const s = await getSession(); if (!s || !hasPermission(s, "INVENTORY")) return denied();
  const parsed = InventoryQuerySchema.safeParse(input); if (!parsed.success) return { success: false as const, message: "Bộ lọc không hợp lệ." };
  const v = parsed.data;
  if (v.kind === "TIEU_HAO") v.locationId = undefined;
  const words = normalizeSearchText(v.search).split(/\s+/).filter(Boolean);
  const where = Prisma.sql`m.company_id=${s.companyId} AND l.hang_muc=${v.kind}::vat_tu."HangMucVatTu"
    ${v.showInactive ? Prisma.empty : Prisma.sql`AND m.dang_su_dung`}
    ${v.categoryId ? Prisma.sql`AND m.loai_vat_tu_id=${v.categoryId}` : Prisma.empty}
    ${v.departmentId ? Prisma.sql`AND m.phong_quan_ly_id=${v.departmentId}` : Prisma.empty}
    ${words.length ? Prisma.sql`AND ${Prisma.join(words.map(w => Prisma.sql`strpos(regexp_replace(normalize(lower(replace(replace(m.ten_mat_hang || ' ' || m.ma_mat_hang,'đ','d'),'Đ','D')),NFD), U&'[\\0300-\\036f]', '', 'g'), ${w})>0`), " AND ")}` : Prisma.empty}
    ${v.locationId ? Prisma.sql`AND EXISTS(SELECT 1 FROM vat_tu.giao_dich_vat_tu g WHERE g.mat_hang_vat_tu_id=m.id AND (g.vi_tri_nhap_id=${v.locationId} OR g.vi_tri_xuat_id=${v.locationId}))` : Prisma.empty}
    ${v.low ? Prisma.sql`AND m.muc_ton_toi_thieu IS NOT NULL AND EXISTS(SELECT 1 FROM vat_tu.giao_dich_vat_tu g WHERE g.mat_hang_vat_tu_id=m.id) AND coalesce((SELECT sum(so_luong) FROM ton_vat_tu(m.id)),0)<=m.muc_ton_toi_thieu` : Prisma.empty}`;
  try {
    const result = await db.$transaction(async tx => {
      const [count] = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) n FROM vat_tu.mat_hang_vat_tu m JOIN vat_tu.loai_vat_tu l ON l.id=m.loai_vat_tu_id WHERE ${where}`;
      const total = Number(count.n), pages = Math.max(1, Math.ceil(total / 20)), page = Math.min(v.page, pages);
      const ids = await tx.$queryRaw<{ id: number }[]>`SELECT m.id FROM vat_tu.mat_hang_vat_tu m JOIN vat_tu.loai_vat_tu l ON l.id=m.loai_vat_tu_id WHERE ${where} ORDER BY m.updated_at DESC,m.id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`;
      const rows = await tx.mat_hang_vat_tu.findMany({ where: { id: { in: ids.map(r => r.id) }, company_id: s.companyId }, select: itemSelect, orderBy: [{ updated_at: "desc" }, { id: "desc" }] });
      const items = await Promise.all(rows.map(async row => {
        const b = await balances(tx, row.id), totalStock = b.stock.reduce((n, r) => n + r.quantity, 0);
        const recorded = await tx.giao_dich_vat_tu.count({ where: { mat_hang_vat_tu_id: row.id } }) > 0;
        return { ...row, recorded, stock: v.locationId ? b.stock.find(r => r.locationId === v.locationId)?.quantity ?? 0 : totalStock, totalStock, issued: b.issued.reduce((n, r) => n + r.quantity, 0), low: recorded && row.muc_ton_toi_thieu !== null && totalStock <= row.muc_ton_toi_thieu };
      }));
      return { rows: items, total, page, pages };
    }, { isolationLevel: "RepeatableRead" });
    return { success: true as const, ...result, canManage: hasPermission(s, "INVENTORY", "MANAGE") };
  } catch { return { success: false as const, message: "Không tải được mặt hàng. Vui lòng thử lại." }; }
}
export async function getInventoryDetail(id: number, historyPage = 1) {
  const s = await getSession(); if (!s || !hasPermission(s, "INVENTORY")) return denied();
  if (!z.number().int().positive().max(2147483647).safeParse(id).success || !z.number().int().min(1).max(1000000).safeParse(historyPage).success) return { success: false as const, message: "Mặt hàng hoặc trang lịch sử không hợp lệ." };
  return db.$transaction(async tx => {
    const row = await tx.mat_hang_vat_tu.findFirst({ where: { id, company_id: s.companyId }, select: itemSelect });
    if (!row) return { success: false as const, message: "Không tìm thấy mặt hàng trong công ty." };
    const b = await balances(tx, id);
    const locations = await tx.vi_tri.findMany({ where: { company_id: s.companyId }, select: { id: true, parent_id: true, ten_vi_tri: true } });
    const count = await tx.giao_dich_vat_tu.count({ where: { mat_hang_vat_tu_id: id, company_id: s.companyId } });
    const pages = Math.max(1, Math.ceil(count / 20)), page = Math.min(historyPage, pages);
    const history = await tx.giao_dich_vat_tu.findMany({ where: { company_id: s.companyId, mat_hang_vat_tu_id: id }, select: transactionSelect, orderBy: { id: "desc" }, skip: (page - 1) * 20, take: 20 });
    const issues = await tx.giao_dich_vat_tu.findMany({ where: { id: { in: b.issued.filter(r => r.quantity > 0).map(r => r.issueId) }, company_id: s.companyId }, select: transactionSelect, orderBy: { id: "desc" } });
    const serialize = (r: typeof history[number]) => ({ ...r, don_gia: r.don_gia?.toFixed(0) ?? null });
    return { success: true as const, row, expected: await snapshot(tx, row), stock: b.stock.map(r => ({ ...r, path: r.locationId === null ? "Còn lại" : locationPath(r.locationId, locations) })), issues: issues.map(r => ({ ...serialize(r), remaining: b.issued.find(q => q.issueId === r.id)!.quantity })), history: history.map(serialize), page, pages, recorded: count > 0 };
  }, { isolationLevel: "RepeatableRead" });
}
export async function saveInventoryCategory(input: unknown) {
  const s = await getSession(); if (!s || !hasPermission(s, "INVENTORY", "MANAGE")) return denied();
  const p = InventoryCategorySchema.safeParse(input); if (!p.success) return { success: false as const, message: "Kiểm tra các trường được đánh dấu.", fieldErrors: p.error.flatten().fieldErrors };
  const v = p.data;
  try {
    const row = await db.$transaction(async tx => {
      await lock(tx, s);
      const before = v.id ? await tx.loai_vat_tu.findFirst({ where: { id: v.id, company_id: s.companyId }, select: categorySelect }) : null;
      assertVersion(before, v.id, v.version);
      const data = { ma_loai: v.code, ten_loai: v.name, hang_muc: v.kind, mo_ta: v.description || null, dang_su_dung: v.active, updated_at: new Date(Math.max(Date.now(), (before?.updated_at.getTime() ?? 0) + 1)) };
      const row = before ? await tx.loai_vat_tu.update({ where: { id: before.id }, data, select: categorySelect }) : await tx.loai_vat_tu.create({ data: { ...data, company_id: s.companyId }, select: categorySelect });
      await audit(tx, s, "loai_vat_tu", row.id, row.ten_loai, before, row); return row;
    });
    revalidatePath("/inventory"); revalidatePath("/asset-management"); return { success: true as const, row };
  } catch (e) { return failure(e); }
}
export async function saveInventoryItem(input: unknown) {
  const s = await getSession(); if (!s || !hasPermission(s, "INVENTORY", "MANAGE")) return denied();
  const p = InventoryItemSchema.safeParse(input); if (!p.success) return { success: false as const, message: "Kiểm tra các trường được đánh dấu.", fieldErrors: p.error.flatten().fieldErrors };
  const v = p.data;
  try {
    const row = await db.$transaction(async tx => {
      await lock(tx, s, v.id);
      const before = v.id ? await tx.mat_hang_vat_tu.findFirst({ where: { id: v.id, company_id: s.companyId }, select: itemSelect }) : null;
      assertVersion(before, v.id, v.version);
      if (!await tx.loai_vat_tu.count({ where: { id: v.categoryId, company_id: s.companyId } }) || (v.departmentId && !await tx.phong_ban.count({ where: { id: v.departmentId, company_id: s.companyId } }))) throw new InventoryError("Loại hoặc phòng quản lý không hợp lệ.");
      const data = { ten_mat_hang: v.name, loai_vat_tu_id: v.categoryId, don_vi_tinh: v.unit, muc_ton_toi_thieu: v.minimum, phong_quan_ly_id: v.departmentId, ghi_chu: v.notes || null, dang_su_dung: v.active, updated_at: new Date(Math.max(Date.now(), (before?.updated_at.getTime() ?? 0) + 1)) };
      if (v.initialQuantity != null) {
        const category = await tx.loai_vat_tu.findFirst({ where: { id: v.categoryId, company_id: s.companyId } });
        if (category?.hang_muc !== "TIEU_HAO") throw new InventoryError("Số lượng ban đầu tại đây chỉ áp dụng cho tiêu hao tồn chung.");
        const prior = await tx.giao_dich_vat_tu.findUnique({ where: { company_id_request_id: { company_id: s.companyId, request_id: v.initialRequestId! } }, include: { mat_hang_vat_tu: { select: itemSelect } } });
        if (prior) {
          if (prior.account_id !== s.userId || prior.loai_giao_dich !== "TON_DAU" || prior.so_luong !== v.initialQuantity || Object.entries(data).filter(([k]) => k !== "updated_at").some(([k, value]) => prior.mat_hang_vat_tu[k as keyof typeof prior.mat_hang_vat_tu] !== value)) throw new InventoryError("Yêu cầu đã được ghi nhận với nội dung khác. Mở hồ sơ để kiểm tra.");
          return prior.mat_hang_vat_tu;
        }
      }
      const row = before ? await tx.mat_hang_vat_tu.update({ where: { id: before.id }, data, select: itemSelect }) : await tx.mat_hang_vat_tu.create({ data: { ...data, company_id: s.companyId }, select: itemSelect });
      await audit(tx, s, "mat_hang_vat_tu", row.id, row.ten_mat_hang, before, row);
      if (v.initialQuantity != null) {
        const opening = await tx.giao_dich_vat_tu.create({ data: { company_id: s.companyId, mat_hang_vat_tu_id: row.id, loai_giao_dich: "TON_DAU", so_luong: v.initialQuantity, request_id: v.initialRequestId!, account_id: s.userId, ly_do: "Ghi nhận số lượng ban đầu khi tạo mặt hàng" } });
        await audit(tx, s, "giao_dich_vat_tu", opening.id, row.ten_mat_hang, null, opening);
      }
      return row;
    });
    revalidatePath("/inventory"); revalidatePath("/asset-management"); return { success: true as const, row };
  } catch (e) { return failure(e); }
}
export async function recordInventoryTransaction(input: unknown) {
  const s = await getSession(); if (!s || !hasPermission(s, "INVENTORY", "MANAGE")) return denied();
  const p = InventoryTransactionSchema.safeParse(input); if (!p.success) return { success: false as const, message: "Kiểm tra các trường được đánh dấu.", fieldErrors: p.error.flatten().fieldErrors };
  const v = p.data;
  try {
    const id = await db.$transaction(async tx => {
      await lock(tx, s, v.itemId);
      const item = await tx.mat_hang_vat_tu.findFirst({ where: { id: v.itemId, company_id: s.companyId }, select: itemSelect });
      if (!item) throw new InventoryError("Không tìm thấy mặt hàng trong công ty.");
      if (v.operation !== "DAO_GIAO_DICH") {
        if (item.loai_vat_tu.hang_muc === "TIEU_HAO") {
          if (v.fromId || v.toId || ["CHUYEN_NOI_GIU", "THU_HOI", "GIAM_DANG_CAP"].includes(v.operation)) throw new InventoryError("Tiêu hao dùng tồn chung, không chọn nơi giữ hoặc thu hồi.");
        } else if ((["TON_DAU", "NHAP", "THU_HOI", "CHUYEN_NOI_GIU", "DIEU_CHINH_TANG"].includes(v.operation) && !v.toId) || (["CAP_PHAT", "CHUYEN_NOI_GIU", "DIEU_CHINH_GIAM"].includes(v.operation) && !v.fromId)) throw new InventoryError("Chọn nơi nhập hoặc nơi xuất cho phụ kiện.");
      }
      let effect = { so_luong: v.quantity, vi_tri_xuat_id: v.fromId, vi_tri_nhap_id: v.toId, nhan_su_nhan_id: v.employeeId, phong_ban_nhan_id: v.departmentId, cap_phat_goc_id: v.issueId, don_gia: v.price ? BigInt(v.price).toString() : null };
      if (v.reversalId || v.issueId) {
        const original = await tx.giao_dich_vat_tu.findFirst({ where: { id: (v.reversalId ?? v.issueId)!, mat_hang_vat_tu_id: v.itemId, company_id: s.companyId } });
        if (!original) throw new InventoryError("Giao dịch gốc không hợp lệ.");
        if (v.reversalId) effect = { so_luong: original.so_luong, vi_tri_xuat_id: original.vi_tri_xuat_id, vi_tri_nhap_id: original.vi_tri_nhap_id, nhan_su_nhan_id: original.nhan_su_nhan_id, phong_ban_nhan_id: original.phong_ban_nhan_id, cap_phat_goc_id: original.cap_phat_goc_id, don_gia: original.don_gia?.toFixed(0) ?? null };
        else { effect.nhan_su_nhan_id = original.nhan_su_nhan_id; effect.phong_ban_nhan_id = original.phong_ban_nhan_id; }
      }
      const data = { ...effect, company_id: s.companyId, mat_hang_vat_tu_id: v.itemId, loai_giao_dich: v.operation, dao_giao_dich_id: v.reversalId, ly_do: v.reason || null, ghi_chu: v.notes || null, request_id: v.requestId, account_id: s.userId };
      const prior = await tx.giao_dich_vat_tu.findUnique({ where: { company_id_request_id: { company_id: s.companyId, request_id: v.requestId } } });
      if (prior) {
        const normalized = { ...prior, don_gia: prior.don_gia?.toFixed(0) ?? null };
        if (Object.entries(data).some(([key, value]) => normalized[key as keyof typeof normalized] !== value)) throw new InventoryError("Yêu cầu này đã được dùng cho nội dung khác. Đóng và mở lại thao tác mới.");
        return prior.id;
      }
      if (await snapshot(tx, item) !== v.expected) throw new InventoryError("Số dư hoặc mặt hàng đã thay đổi. Bấm Cập nhật số dư, kiểm tra lại rồi xác nhận.");
      const row = await tx.giao_dich_vat_tu.create({ data });
      await audit(tx, s, "giao_dich_vat_tu", row.id, item.ten_mat_hang, null, row);
      return row.id;
    });
    revalidatePath("/inventory"); return { success: true as const, id };
  } catch (e) { return failure(e); }
}
