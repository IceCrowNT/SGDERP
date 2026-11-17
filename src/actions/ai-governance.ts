"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { canAi, canAdministerAi, type AiAction } from "@/lib/role-catalog";
import { canUseAiPilot } from "@/lib/ai-pilot";
import { AiConnectionError } from "@/lib/validations/ai-settings";
import { AiPricesSchema, SaveAiPolicySchema, SaveAiJobSchema, SaveAiLimitSchema, AiUsageFilterSchema, ReconcileAiCallSchema, aiMonth, aiMonthBounds } from "@/lib/validations/ai-governance";
import { usageAmounts } from "@/lib/ai-cost";

async function actor(action?: AiAction) {
  const session = await getSession();
  if (!session || (action ? !canAi(session, action) : !canAdministerAi(session))) throw new AiConnectionError("Bạn không có quyền quản trị AI này.");
  return session;
}
async function lock(tx: Prisma.TransactionClient, session: SessionUser, action: AiAction) {
  await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
  await currentActor(tx, session, "AI", action);
}
function failure(error: unknown) { return { success: false as const, message: error instanceof AiConnectionError ? error.message : "Chưa xử lý được cài đặt AI. Kiểm tra quyền và thử lại." }; }
function refresh() { revalidatePath("/settings/ai"); revalidatePath("/"); revalidatePath("/profile"); }
function version(old: Date) { return new Date(Math.max(Date.now(), old.getTime() + 1)); }
function audit(session: SessionUser, action: string, target: string, before: Prisma.InputJsonValue, after: Prisma.InputJsonValue) {
  return { company_id: session.companyId, account_id: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName,
    phan_he: "AI", hanh_dong: action, doi_tuong_id: target, mo_ta: "Cập nhật quản trị sử dụng AI", du_lieu_cu: before, du_lieu_moi: after };
}

export async function getAiGovernance() {
  try {
    const session = await actor(), manage = canAi(session, "MANAGE_CONNECTIONS"), limits = canAi(session, "MANAGE_LIMITS"), usage = canAi(session, "VIEW_USAGE");
    const [connections, jobs, accounts] = await Promise.all([
      manage || usage ? db.ket_noi_ai.findMany({ where: { company_id: session.companyId }, orderBy: { id: "asc" } }) : [],
      manage ? db.cau_hinh_tac_vu_ai.findMany({ where: { company_id: session.companyId } }) : [],
      limits || usage ? db.tai_khoan.findMany({ where: { company_id: session.companyId }, select: { id: true, ten_dang_nhap: true, ten_hien_thi: true, cho_phep_dang_nhap: true, updated_at: true, han_muc_ai_thang: true }, orderBy: { ten_hien_thi: "asc" } }) : [],
    ]);
    return { success: true as const, permissions: { manage, limits, usage },
      connections: connections.map(row => ({ id: row.id, name: row.ten_ket_noi, model: row.model_mac_dinh, enabled: row.dang_su_dung, isDefault: row.la_mac_dinh,
        version: row.updated_at.toISOString(), limit: row.han_muc_chi_phi_thang?.toFixed(6) ?? null, prices: manage ? AiPricesSchema.safeParse(row.cau_hinh_gia).data ?? null : null })),
      jobs: jobs.map(row => ({ job: row.ma_tac_vu, connectionId: row.ket_noi_ai_id, model: row.model, prices: AiPricesSchema.safeParse(row.cau_hinh_gia).data ?? null, version: row.updated_at.toISOString() })),
      accounts: accounts.map(row => ({ id: row.id, name: row.ten_hien_thi, username: row.ten_dang_nhap, active: row.cho_phep_dang_nhap, version: row.updated_at.toISOString(), limit: row.han_muc_ai_thang?.toFixed(6) ?? null })) };
  } catch (error) { return failure(error); }
}

export async function saveAiConnectionPolicy(input: unknown) {
  try {
    const session = await actor("MANAGE_CONNECTIONS"), parsed = SaveAiPolicySchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: "Kiểm tra hạn mức và bảng giá.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data;
    await db.$transaction(async tx => {
      await lock(tx, session, "MANAGE_CONNECTIONS");
      const row = await tx.ket_noi_ai.findFirst({ where: { id: v.id, company_id: session.companyId } });
      if (!row || row.updated_at.toISOString() !== v.version) throw new AiConnectionError("Kết nối đã thay đổi. Tải lại trước khi lưu.");
      if (v.prices && v.prices.model !== row.model_mac_dinh) throw new AiConnectionError("Bảng giá phải đúng model mặc định hiện tại.");
      await tx.ket_noi_ai.update({ where: { id: row.id }, data: { han_muc_chi_phi_thang: v.limit, cau_hinh_gia: v.prices ?? Prisma.DbNull, updated_at: version(row.updated_at) } });
      await tx.nhat_ky_hoat_dong.create({ data: audit(session, "AI_POLICY", `ket_noi_ai:${row.id}`, { limit: row.han_muc_chi_phi_thang?.toFixed(6) ?? null, prices: row.cau_hinh_gia }, { limit: v.limit, prices: v.prices }) });
    });
    refresh(); return { success: true as const, message: "Đã lưu ngân sách và đơn giá kết nối." };
  } catch (error) { return failure(error); }
}

export async function saveAiJob(input: unknown) {
  try {
    const session = await actor("MANAGE_CONNECTIONS"), parsed = SaveAiJobSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: "Kiểm tra kết nối, model và bảng giá của tác vụ.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data;
    await db.$transaction(async tx => {
      await lock(tx, session, "MANAGE_CONNECTIONS");
      const row = await tx.cau_hinh_tac_vu_ai.findUnique({ where: { company_id_ma_tac_vu: { company_id: session.companyId, ma_tac_vu: v.job } } });
      if ((row?.updated_at.toISOString() ?? null) !== v.version) throw new AiConnectionError("Tác vụ đã thay đổi. Tải lại trước khi lưu.");
      if (v.connectionId && !await tx.ket_noi_ai.count({ where: { id: v.connectionId, company_id: session.companyId, dang_su_dung: true } })) throw new AiConnectionError("Chọn kết nối đang hoạt động trong công ty.");
      const data = { ket_noi_ai_id: v.connectionId, model: v.model, cau_hinh_gia: v.prices ?? Prisma.DbNull, updated_at: row ? version(row.updated_at) : new Date() };
      if (row) await tx.cau_hinh_tac_vu_ai.update({ where: { id: row.id }, data });
      else await tx.cau_hinh_tac_vu_ai.create({ data: { ...data, company_id: session.companyId, ma_tac_vu: v.job } });
      await tx.nhat_ky_hoat_dong.create({ data: audit(session, "AI_JOB", `ai_job:${v.job}`, { connectionId: row?.ket_noi_ai_id ?? null, model: row?.model ?? null, prices: row?.cau_hinh_gia ?? null }, { connectionId: v.connectionId, model: v.model, prices: v.prices }) });
    });
    refresh(); return { success: true as const, message: "Đã lưu kết nối và model cho tác vụ." };
  } catch (error) { return failure(error); }
}

export async function saveAiAccountLimit(input: unknown) {
  try {
    const session = await actor("MANAGE_LIMITS"), parsed = SaveAiLimitSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: "Kiểm tra hạn mức tài khoản.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data;
    await db.$transaction(async tx => {
      await lock(tx, session, "MANAGE_LIMITS");
      const row = await tx.tai_khoan.findFirst({ where: { id: v.accountId, company_id: session.companyId } });
      if (!row || row.updated_at.toISOString() !== v.version) throw new AiConnectionError("Tài khoản đã thay đổi. Tải lại trước khi lưu.");
      await tx.tai_khoan.update({ where: { id: row.id }, data: { han_muc_ai_thang: v.limit, updated_at: version(row.updated_at) } });
      await tx.nhat_ky_hoat_dong.create({ data: audit(session, "AI_LIMIT", `tai_khoan:${row.id}`, { limit: row.han_muc_ai_thang?.toFixed(6) ?? null }, { limit: v.limit }) });
    });
    refresh(); return { success: true as const, message: "Đã lưu hạn mức tháng. Mức sử dụng đã có được giữ nguyên." };
  } catch (error) { return failure(error); }
}

export async function getMyAiUsage() {
  try {
    const session = await getSession();
    if (!session || !canUseAiPilot(session)) throw new AiConnectionError("Chưa có quyền xem mức sử dụng AI.");
    const month = aiMonth(), row = await db.tai_khoan.findFirstOrThrow({ where: { id: session.userId, company_id: session.companyId }, select: { han_muc_ai_thang: true } });
    const totals = await db.nhat_ky_goi_ai.aggregate({ where: { company_id: session.companyId, account_id: session.userId, created_at: aiMonthBounds(month) }, _sum: { chi_phi_uoc_tinh: true, du_phong: true } });
    const unknown = await db.nhat_ky_goi_ai.count({ where: { company_id: session.companyId, account_id: session.userId, created_at: aiMonthBounds(month), chi_phi_uoc_tinh: null, du_phong: null } });
    return { success: true as const, month, canCall: canUseAiPilot(session), ...usageAmounts(totals._sum, row.han_muc_ai_thang, unknown > 0) };
  } catch (error) { return failure(error); }
}

export async function getAiUsage(input: unknown) {
  try {
    const session = await actor("VIEW_USAGE"), parsed = AiUsageFilterSchema.safeParse(input);
    if (!parsed.success) throw new AiConnectionError("Bộ lọc sử dụng AI chưa hợp lệ.");
    const v = parsed.data, where = { company_id: session.companyId, account_id: v.accountId, ket_noi_ai_id: v.connectionId, model: v.model, created_at: aiMonthBounds(v.month) };
    const [totals, count, groups, rows, unresolved] = await Promise.all([
      db.nhat_ky_goi_ai.aggregate({ where, _sum: { token_dau_vao: true, token_cache: true, token_dau_ra: true, chi_phi_uoc_tinh: true, du_phong: true } }),
      db.nhat_ky_goi_ai.count({ where }),
      db.nhat_ky_goi_ai.groupBy({ by: ["ma_yeu_cau"], where }),
      db.nhat_ky_goi_ai.findMany({ where, take: 25, skip: (v.page - 1) * 25, orderBy: { id: "desc" }, include: { tai_khoan: { select: { ten_hien_thi: true, ten_dang_nhap: true } }, ket_noi: { select: { ten_ket_noi: true } } } }),
      db.nhat_ky_goi_ai.count({ where: { ...where, chi_phi_uoc_tinh: null } }),
    ]);
    const sum = totals._sum;
    return { success: true as const, month: v.month, page: v.page, total: count, requests: groups.length, unresolved,
      input: sum.token_dau_vao ?? 0, cached: sum.token_cache ?? 0, output: sum.token_dau_ra ?? 0,
      cost: sum.chi_phi_uoc_tinh?.toFixed(6) ?? "0.000000", reserved: sum.du_phong?.toFixed(6) ?? "0.000000",
      rows: rows.map(row => ({ id: row.id, account: row.tai_khoan.ten_hien_thi, username: row.tai_khoan.ten_dang_nhap, connection: row.ket_noi.ten_ket_noi, model: row.model, job: row.ma_tac_vu,
        status: row.trang_thai, input: row.token_dau_vao, cached: row.token_cache, output: row.token_dau_ra, cost: row.chi_phi_uoc_tinh?.toFixed(6) ?? null,
        reserved: row.du_phong?.toFixed(6) ?? null, at: row.created_at.toISOString(), canReconcile: row.chi_phi_uoc_tinh === null && row.created_at.getTime() < Date.now() - 180000 })) };
  } catch (error) { return failure(error); }
}

export async function reconcileAiCall(input: unknown) {
  try {
    const session = await actor("MANAGE_LIMITS"), parsed = ReconcileAiCallSchema.safeParse(input);
    if (!canAi(session, "VIEW_USAGE")) throw new AiConnectionError("Cần quyền xem mức sử dụng để đối chiếu khoản chưa rõ.");
    if (!parsed.success) return { success: false as const, message: "Nhập chi phí và căn cứ đối chiếu.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data;
    await db.$transaction(async tx => {
      await lock(tx, session, "MANAGE_LIMITS"); await currentActor(tx, session, "AI", "VIEW_USAGE");
      const row = await tx.nhat_ky_goi_ai.findFirst({ where: { id: v.id, company_id: session.companyId } });
      if (!row || row.chi_phi_uoc_tinh !== null || row.created_at.getTime() >= Date.now() - 180000) throw new AiConnectionError("Khoản này chưa thể đối chiếu hoặc đã được xử lý. Hãy tải lại.");
      if (await tx.tin_nhan_ai.count({ where: { company_id: session.companyId, ma_yeu_cau: row.ma_yeu_cau, trang_thai: "DANG_XU_LY", het_han_xu_ly: { gt: new Date() } } })) throw new AiConnectionError("Lượt chat còn đang xử lý. Hãy chờ hoàn tất.");
      await tx.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { trang_thai: "DOI_SOAT", chi_phi_uoc_tinh: v.cost, du_phong: 0, hoan_tat_at: new Date() } });
      await tx.nhat_ky_hoat_dong.create({ data: audit(session, "AI_RECONCILE", `nhat_ky_goi_ai:${row.id}`, { reserved: row.du_phong?.toFixed(6) ?? null, status: row.trang_thai }, { cost: v.cost, reason: v.reason }) });
    });
    refresh(); return { success: true as const, message: "Đã ghi nhận chi phí đối chiếu và giải phóng dự phòng." };
  } catch (error) { return failure(error); }
}
