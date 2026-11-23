"use server";

import { z } from "zod";
import { Prisma, type cong_viec_ai } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hasPermission, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { canUseAiChat } from "@/lib/ai-pilot";
import { CategoryWorkSchema, WorkSnapshotSchema, WorkStatusSchema, WorkResultSchema, type AiWorkView, type CategoryWorkView } from "@/lib/ai-work";

import { inventoryReceiptView } from "@/lib/ai-inventory-receipt";
import { mutateInventoryReceiptWork } from "@/actions/ai-inventory-receipt";

class WorkError extends Error {}
const identity = z.object({ id: z.number().int().positive(), version: z.number().int().positive() }).strict();
function failure(error: unknown) {
  return { success: false as const, message: error instanceof WorkError ? error.message : "Không xử lý được công việc. Hãy tải trạng thái và kiểm tra quyền truy cập." };
}
async function actor() {
  const session = await getSession();
  if (!session || !canUseAiChat(session)) throw new WorkError("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
  return session;
}
async function lock(tx: Prisma.TransactionClient, session: SessionUser) {
  await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
  const current = await currentActor(tx, session, "ASSETS");
  if (!canUseAiChat({ ...session, permissions: current.permissions })) throw new WorkError("Quyền trợ lý AI đã thay đổi.");
}
const owned = (session: SessionUser) => ({ company_id: session.companyId, account_id: session.userId });
function view(row: cong_viec_ai): CategoryWorkView {
  if (row.loai_cong_viec !== "KHAU_HAO_LOAI") throw new WorkError("Loại công việc chưa được hỗ trợ.");
  return { kind: "KHAU_HAO_LOAI", id: row.id, version: row.phien_ban, status: WorkStatusSchema.parse(row.trang_thai),
    snapshot: WorkSnapshotSchema.parse(row.noi_dung), result: row.ket_qua === null ? null : WorkResultSchema.parse(row.ket_qua),
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), approvedAt: row.thoi_diem_duyet?.toISOString() ?? null };
}
async function snapshot(tx: Prisma.TransactionClient, session: SessionUser, months: number) {
  const rows = await tx.loai_tai_san.findMany({ where: { company_id: session.companyId }, orderBy: { id: "asc" }, take: 2001,
    select: { id: true, ma_loai: true, ten_loai: true, dang_su_dung: true, khau_hao_mac_dinh_thang: true, updated_at: true } });
  if (rows.length > 2000) throw new WorkError("Danh mục vượt giới hạn 2.000 loại của bản thử; chưa lập hoặc thực hiện công việc.");
  return WorkSnapshotSchema.parse({ schemaVersion: 1, months, rows: rows.map(r => ({ id: r.id, code: r.ma_loai, name: r.ten_loai, active: r.dang_su_dung, before: r.khau_hao_mac_dinh_thang, version: r.updated_at.toISOString() })) });
}
function proposal(data: CategoryWorkView["snapshot"]) {
  const changed = data.rows.filter(r => r.before !== data.months).length;
  return { trang_thai: changed ? "CHO_DUYET" : "KHONG_CAN_DOI", noi_dung: data,
    ket_qua: changed ? Prisma.DbNull : { changed: 0, unchanged: data.rows.length } };
}
async function audit(tx: Prisma.TransactionClient, session: SessionUser, id: number, action: string, details: Prisma.InputJsonObject = {}) {
  await tx.nhat_ky_hoat_dong.create({ data: { ...owned(session), ten_dang_nhap: session.username, ho_ten: session.fullName,
    phan_he: "AI", hanh_dong: action, doi_tuong_id: `cong_viec_ai:${id}`, mo_ta: "Công việc AI: khấu hao mặc định loại tài sản", du_lieu_moi: details } });
}
export async function prepareCategoryDepreciationWork(input: unknown) {
  try {
    const session = await actor();
    const { requestId, months } = CategoryWorkSchema.extend({ requestId: z.string().uuid() }).parse(input);
    const work = await db.$transaction(async tx => {
      await lock(tx, session);
      const existing = await tx.cong_viec_ai.findFirst({ where: { ...owned(session), ma_yeu_cau: requestId } });
      if (existing) {
        const result = view(existing);
        if (result.snapshot.months !== months) throw new WorkError("Mã yêu cầu đã dùng cho nội dung khác.");
        return result;
      }
      const data = await snapshot(tx, session, months);
      const row = await tx.cong_viec_ai.create({ data: { ...owned(session), ma_yeu_cau: requestId, loai_cong_viec: "KHAU_HAO_LOAI", ...proposal(data) } });
      await audit(tx, session, row.id, "AI_WORK_PREPARE", { months, count: data.rows.length });
      return view(row);
    });
    return { success: true as const, work };
  } catch (error) { return failure(error); }
}
function readable(s: SessionUser) {
  return { loai_cong_viec: { in: [...(hasPermission(s, "ASSETS", "MANAGE") ? ["KHAU_HAO_LOAI"] : []), ...(hasPermission(s, "INVENTORY", "MANAGE") ? ["NHAP_VAT_TU"] : [])] } };
}
function anyView(row: cong_viec_ai): AiWorkView { return row.loai_cong_viec === "NHAP_VAT_TU" ? inventoryReceiptView(row) : view(row); }
export async function listAiWorks(input: unknown = {}) {
  try {
    const session = await actor();
    const { beforeId } = z.object({ beforeId: z.number().int().positive().optional() }).strict().parse(input);
    const rows = await db.cong_viec_ai.findMany({ where: { ...owned(session), ...readable(session), ...(beforeId ? { id: { lt: beforeId } } : {}) }, orderBy: { id: "desc" }, take: 11 });
    return { success: true as const, works: rows.slice(0, 10).map(anyView), nextCursor: rows.length > 10 ? rows[9].id : null };
  } catch (error) { return failure(error); }
}
export async function getAiWork(input: unknown) {
  try {
    const session = await actor(), { id } = z.object({ id: z.number().int().positive() }).strict().parse(input);
    const row = await db.cong_viec_ai.findFirst({ where: { ...owned(session), ...readable(session), id } });
    if (!row) throw new WorkError("Không tìm thấy công việc của bạn.");
    return { success: true as const, work: anyView(row) };
  } catch (error) { return failure(error); }
}
async function mutate(input: unknown, operation: "approve" | "refresh" | "cancel") {
  try {
    const session = await actor(), { id, version } = identity.parse(input);
    const kind = await db.cong_viec_ai.findFirst({ where: { ...owned(session), id }, select: { loai_cong_viec: true } });
    if (kind?.loai_cong_viec === "NHAP_VAT_TU") return mutateInventoryReceiptWork(input, operation);
    const work = await db.$transaction(async tx => {
      await lock(tx, session);
      const row = await tx.cong_viec_ai.findFirst({ where: { ...owned(session), id } });
      if (!row) throw new WorkError("Không tìm thấy công việc của bạn.");
      const current = view(row);
      if (current.version !== version) throw new WorkError("Bảng công việc đã có phiên bản mới. Hãy tải trạng thái và xem lại trước khi duyệt.");
      if ((operation === "approve" && current.status === "HOAN_TAT") || (operation === "cancel" && current.status === "DA_HUY")) return current;
      if (!["CHO_DUYET", "CAN_LAM_MOI"].includes(current.status)) throw new WorkError("Công việc đã kết thúc. Hãy tạo yêu cầu mới nếu cần thay đổi.");
      let data: Prisma.cong_viec_aiUpdateInput;
      if (operation === "cancel") data = { trang_thai: "DA_HUY" };
      else {
        const fresh = await snapshot(tx, session, current.snapshot.months);
        if (operation === "refresh") data = { ...proposal(fresh), phien_ban: { increment: 1 } };
        else if (current.status !== "CHO_DUYET" || JSON.stringify(fresh) !== JSON.stringify(current.snapshot)) {
          data = { trang_thai: "CAN_LAM_MOI" };
        } else {
          const changed = fresh.rows.filter(r => r.before !== fresh.months);
          // Same company lock as asset/category writes; every update and audit commits together.
          for (const item of changed) {
            await tx.loai_tai_san.update({ where: { id: item.id, company_id: session.companyId }, data: {
              khau_hao_mac_dinh_thang: fresh.months, updated_at: new Date(Math.max(Date.now(), new Date(item.version).getTime() + 1)) } });
            await tx.nhat_ky_hoat_dong.create({ data: { ...owned(session), ten_dang_nhap: session.username, ho_ten: session.fullName,
              phan_he: "ASSETS", hanh_dong: "UPDATE", doi_tuong_id: `loai_tai_san:${item.id}`, ten_doi_tuong: item.name,
              mo_ta: `Duyệt công việc AI #${id}: khấu hao mặc định ${item.name}`,
              du_lieu_cu: { khau_hao_mac_dinh_thang: item.before }, du_lieu_moi: { khau_hao_mac_dinh_thang: fresh.months, cong_viec_ai_id: id } } });
          }
          data = { trang_thai: "HOAN_TAT", thoi_diem_duyet: new Date(), ket_qua: { changed: changed.length, unchanged: fresh.rows.length - changed.length } };
        }
      }
      const updated = await tx.cong_viec_ai.update({ where: { id }, data: {
        ...data, updated_at: new Date(Math.max(Date.now(), row.updated_at.getTime() + 1)),
      } });
      await audit(tx, session, id, `AI_WORK_${operation.toUpperCase()}`, { version: updated.phien_ban, status: updated.trang_thai });
      return view(updated);
    }, { timeout: 30000 });
    if (work.status === "HOAN_TAT") revalidatePath("/assets");
    return { success: true as const, work };
  } catch (error) { return failure(error); }
}
export async function approveAiWork(input: unknown) { return mutate(input, "approve"); }
export async function refreshAiWork(input: unknown) { return mutate(input, "refresh"); }
export async function cancelAiWork(input: unknown) { return mutate(input, "cancel"); }
