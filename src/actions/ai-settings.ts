"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { canManageAiConnections } from "@/lib/role-catalog";
import { aiConnectionView, readEnvironmentAiConnection } from "@/lib/ai-connection";
import { readAiSecret, storeAiSecret } from "@/lib/ai-secret-store";
import { AiApiKeySchema, AiConnectionError, AiModelSchema, SaveAiSettingsSchema, TestAiKeySchema } from "@/lib/validations/ai-settings";

async function actor(expected?: SessionUser) {
  const session = await getSession();
  if (!session || !canManageAiConnections(session) || (expected && (session.userId !== expected.userId || session.companyId !== expected.companyId || session.sessionVersion !== expected.sessionVersion)))
    throw new AiConnectionError("Bạn không có quyền quản lý kết nối AI này.");
  return session;
}
async function lock(tx: Prisma.TransactionClient, session: SessionUser) {
  await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
  await currentActor(tx, session, "AI", "MANAGE_CONNECTIONS");
}
function checkVersion(row: { updated_at: Date } | null, version: string | null) {
  if ((row?.updated_at.toISOString() ?? null) !== version)
    throw new AiConnectionError("Cài đặt đã thay đổi ở nơi khác. Tải lại cài đặt trước khi lưu.");
}
function metadata(row: { model_mac_dinh: string; hau_to_khoa: string; phien_ban_khoa: number; dang_su_dung: boolean } | null) {
  return row ? { model: row.model_mac_dinh, keySuffix: row.hau_to_khoa, keyVersion: row.phien_ban_khoa, enabled: row.dang_su_dung } : null;
}
function audit(session: SessionUser, action: string, message: string) {
  return { company_id: session.companyId, account_id: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName,
    phan_he: "AI", hanh_dong: action, mo_ta: message };
}
function failure(error: unknown) {
  return { success: false as const, message: error instanceof AiConnectionError ? error.message : "Chưa cập nhật được kết nối AI. Kiểm tra quyền và thử lại." };
}

export async function getAiSettings() {
  try {
    const session = await actor();
    return { success: true as const, settings: await aiConnectionView(session.companyId) };
  } catch (error) { return failure(error); }
}

export async function saveAiSettings(input: unknown) {
  try {
    const session = await actor();
    const parsed = SaveAiSettingsSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: "Kiểm tra thông tin cài đặt.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data;
    const previous = await db.ket_noi_ai.findUnique({ where: { company_id: session.companyId } });
    checkVersion(previous, v.version);
    const newKey = v.apiKey || (!previous ? (await readEnvironmentAiConnection(session.companyId))?.apiKey : undefined);
    if (!previous && !newKey) return { success: false as const, message: "Nhập API key cho lần thiết lập đầu tiên.", fieldErrors: { apiKey: ["Nhập API key."] } };
    if (newKey && !AiApiKeySchema.safeParse(newKey).success) throw new AiConnectionError("API key chưa hợp lệ. Nhập khóa mới để tiếp tục.");
    // Write a new immutable secret before the DB transaction. Keep uncertain/orphan versions for reconciliation.
    const reference = newKey ? await storeAiSecret(session.companyId, newKey) : previous!.tham_chieu_bi_mat;
    await db.$transaction(async tx => {
      await lock(tx, session);
      const before = await tx.ket_noi_ai.findUnique({ where: { company_id: session.companyId } });
      checkVersion(before, v.version);
      const data = { model_mac_dinh: v.model, tham_chieu_bi_mat: reference,
        hau_to_khoa: newKey ? newKey.slice(-4) : before!.hau_to_khoa,
        phien_ban_khoa: before ? before.phien_ban_khoa + (newKey ? 1 : 0) : 1,
        dang_su_dung: v.enabled, updated_at: new Date(Math.max(Date.now(), (before?.updated_at.getTime() ?? 0) + 1)) };
      const after = before ? await tx.ket_noi_ai.update({ where: { id: before.id }, data })
        : await tx.ket_noi_ai.create({ data: { ...data, company_id: session.companyId } });
      await tx.nhat_ky_hoat_dong.create({ data: { ...audit(session, before ? "UPDATE" : "CREATE", "Cập nhật kết nối và model AI"),
        doi_tuong_id: `ket_noi_ai:${after.id}`, du_lieu_cu: metadata(before) ?? Prisma.DbNull, du_lieu_moi: metadata(after)! } });
    });
    revalidatePath("/");
    revalidatePath("/settings/ai");
    revalidatePath("/settings");
    return { success: true as const, settings: await aiConnectionView(session.companyId), message: "Đã lưu cài đặt AI." };
  } catch (error) { return failure(error); }
}

export async function testAiKey(input: unknown) {
  try {
    const session = await actor();
    const parsed = TestAiKeySchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: "API key chưa hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data;
    const row = await db.ket_noi_ai.findUnique({ where: { company_id: session.companyId } });
    checkVersion(row, v.version);
    const apiKey = v.apiKey || (row ? await readAiSecret(session.companyId, row.tham_chieu_bi_mat) : (await readEnvironmentAiConnection(session.companyId))?.apiKey);
    if (!apiKey || !AiApiKeySchema.safeParse(apiKey).success) throw new AiConnectionError("Nhập API key trước khi kiểm tra.");
    await db.$transaction(async tx => {
      await lock(tx, session);
      checkVersion(await tx.ket_noi_ai.findUnique({ where: { company_id: session.companyId } }), v.version);
      const count = await tx.nhat_ky_hoat_dong.count({ where: { company_id: session.companyId, account_id: session.userId,
        phan_he: "AI", hanh_dong: "AI_KEY_TEST", created_at: { gte: new Date(Date.now() - 300_000) } } });
      if (count >= 10) throw new AiConnectionError("Đã kiểm tra khóa nhiều lần. Hãy chờ vài phút rồi thử lại.");
      await tx.nhat_ky_hoat_dong.create({ data: audit(session, "AI_KEY_TEST", "Kiểm tra quyền đọc danh sách model OpenAI") });
    });
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    } catch { throw new AiConnectionError("Chưa kết nối được OpenAI. Cấu hình đang lưu vẫn được giữ."); }
    if (!response.ok) throw new AiConnectionError(response.status === 401 ? "OpenAI không chấp nhận khóa này. Kiểm tra lại API key."
      : response.status === 403 ? "Khóa chưa có quyền đọc danh sách model. Bạn vẫn có thể nhập tên model được cấp quyền."
      : response.status === 429 ? "OpenAI đang giới hạn lượt kiểm tra. Hãy thử lại sau." : "Chưa đọc được danh sách model từ OpenAI.");
    const data = z.object({ data: z.array(z.object({ id: z.string() })).max(5000) }).safeParse(await response.json());
    if (!data.success) throw new AiConnectionError("Danh sách model trả về không hợp lệ.");
    const models = [...new Set(data.data.data.flatMap(({ id }) => {
      const model = AiModelSchema.safeParse(id);
      return model.success && !model.data.includes(apiKey) ? [model.data] : [];
    }))].sort();
    await actor(session);
    checkVersion(await db.ket_noi_ai.findUnique({ where: { company_id: session.companyId } }), v.version);
    return { success: true as const, models, message: "Đã đọc được danh sách model. Chọn model hỗ trợ hội thoại và gọi công cụ; thay đổi chỉ áp dụng sau khi lưu." };
  } catch (error) { return failure(error); }
}
