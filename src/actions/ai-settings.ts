"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { canManageAiConnections } from "@/lib/role-catalog";
import { aiConnectionView, aiConnectionsView, connectionView, defaultConnectionStamp, readEnvironmentAiConnection } from "@/lib/ai-connection";
import { readAiSecret, storeAiSecret } from "@/lib/ai-secret-store";
import { AiApiKeySchema, AiConnectionError, AiConnectionTargetSchema, AiModelSchema, SaveAiSettingsSchema, SetDefaultAiConnectionSchema, TestAiKeySchema, type AiConnectionTarget } from "@/lib/validations/ai-settings";

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
async function selected(client: Prisma.TransactionClient, companyId: number, target: AiConnectionTarget, version: string | null) {
  if (typeof target === "number") {
    const row = await client.ket_noi_ai.findFirst({ where: { id: target, company_id: companyId } });
    if (!row) throw new AiConnectionError("Kết nối không còn khả dụng. Hãy tải lại danh sách.");
    if (row.updated_at.toISOString() !== version) throw new AiConnectionError("Cài đặt đã thay đổi ở nơi khác. Tải lại cài đặt trước khi lưu.");
    return row;
  }
  if (version !== null || (target === "environment" && await client.ket_noi_ai.count({ where: { company_id: companyId } })))
    throw new AiConnectionError("Cài đặt đã thay đổi ở nơi khác. Tải lại cài đặt trước khi lưu.");
  return null;
}
function metadata(row: { id: number; ten_ket_noi: string; model_mac_dinh: string; hau_to_khoa: string; phien_ban_khoa: number; dang_su_dung: boolean; la_mac_dinh: boolean } | null) {
  return row ? { id: row.id, name: row.ten_ket_noi, model: row.model_mac_dinh, keySuffix: row.hau_to_khoa, keyVersion: row.phien_ban_khoa, enabled: row.dang_su_dung, isDefault: row.la_mac_dinh } : null;
}
function audit(session: SessionUser, action: string, message: string) {
  return { company_id: session.companyId, account_id: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName,
    phan_he: "AI", hanh_dong: action, mo_ta: message };
}
function failure(error: unknown) {
  return { success: false as const, message: error instanceof AiConnectionError ? error.message : "Chưa cập nhật được kết nối AI. Kiểm tra quyền và thử lại." };
}
function refresh() { revalidatePath("/"); revalidatePath("/settings/ai"); revalidatePath("/settings"); }
function nextVersion(previous: Date) { return new Date(Math.max(Date.now(), previous.getTime() + 1)); }

export async function getAiConnections() {
  try { const session = await actor(); return { success: true as const, ...await aiConnectionsView(session.companyId) }; }
  catch (error) { return failure(error); }
}
export async function getAiSettings(target?: unknown) {
  try {
    const session = await actor();
    const value = target === undefined ? undefined : AiConnectionTargetSchema.parse(target);
    return { success: true as const, settings: await aiConnectionView(session.companyId, value) };
  } catch (error) { return failure(error); }
}

export async function saveAiSettings(input: unknown) {
  try {
    const session = await actor(), parsed = SaveAiSettingsSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: "Kiểm tra thông tin cài đặt.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data;
    const previous = await selected(db, session.companyId, v.target, v.version);
    const hasManaged = await db.ket_noi_ai.count({ where: { company_id: session.companyId } });
    const environment = !hasManaged ? await readEnvironmentAiConnection(session.companyId) : null;
    if (v.target === "environment" && v.apiKey) throw new AiConnectionError("Lưu kết nối máy chủ trước khi thay key; dùng Thêm kết nối để giữ cả hai khóa.");
    const newKey = v.apiKey || (v.target === "environment" ? environment?.apiKey : undefined);
    if (!previous && !newKey) return { success: false as const, message: "Nhập API key cho kết nối mới.", fieldErrors: { apiKey: ["Nhập API key."] } };
    if (newKey && !AiApiKeySchema.safeParse(newKey).success) throw new AiConnectionError("API key chưa hợp lệ. Nhập khóa mới để tiếp tục.");
    // Preserve the environment connection before adding a different key. Never overwrite its model/key.
    const preserveEnvironment = v.target === "new" && Boolean(environment?.apiKey);
    if (preserveEnvironment && (!AiApiKeySchema.safeParse(environment?.apiKey).success || !AiModelSchema.safeParse(environment?.model).success))
      throw new AiConnectionError("Kết nối máy chủ chưa đầy đủ. Hãy lưu kết nối hiện tại trước khi thêm key khác.");
    const reference = newKey ? await storeAiSecret(session.companyId, newKey) : previous!.tham_chieu_bi_mat;
    const environmentReference = preserveEnvironment ? await storeAiSecret(session.companyId, environment!.apiKey!) : null;
    const saved = await db.$transaction(async tx => {
      await lock(tx, session);
      const before = await selected(tx, session.companyId, v.target, v.version);
      let count = await tx.ket_noi_ai.count({ where: { company_id: session.companyId } });
      if (!count && environmentReference) {
        const imported = await tx.ket_noi_ai.create({ data: { company_id: session.companyId, ten_ket_noi: "OpenAI từ máy chủ", model_mac_dinh: environment!.model!,
          tham_chieu_bi_mat: environmentReference, hau_to_khoa: environment!.apiKey!.slice(-4), la_mac_dinh: true } });
        await tx.nhat_ky_hoat_dong.create({ data: { ...audit(session, "CREATE", "Bảo toàn kết nối AI từ cấu hình máy chủ"), doi_tuong_id: `ket_noi_ai:${imported.id}`, du_lieu_moi: metadata(imported)! } });
        count++;
      }
      const data = { ten_ket_noi: v.name, model_mac_dinh: v.model, tham_chieu_bi_mat: reference,
        hau_to_khoa: newKey ? newKey.slice(-4) : before!.hau_to_khoa,
        phien_ban_khoa: before ? before.phien_ban_khoa + (newKey ? 1 : 0) : 1,
        dang_su_dung: v.enabled, updated_at: before ? nextVersion(before.updated_at) : new Date() };
      const after = before ? await tx.ket_noi_ai.update({ where: { id: before.id }, data })
        : await tx.ket_noi_ai.create({ data: { ...data, company_id: session.companyId, la_mac_dinh: count === 0 } });
      await tx.nhat_ky_hoat_dong.create({ data: { ...audit(session, before ? "UPDATE" : "CREATE", "Cập nhật kết nối và model AI"),
        doi_tuong_id: `ket_noi_ai:${after.id}`, du_lieu_cu: metadata(before) ?? Prisma.DbNull, du_lieu_moi: metadata(after)! } });
      return after;
    });
    refresh();
    return { success: true as const, settings: connectionView(saved), message: "Đã lưu cài đặt AI." };
  } catch (error) { return failure(error); }
}

export async function setDefaultAiConnection(input: unknown) {
  try {
    const session = await actor(), parsed = SetDefaultAiConnectionSchema.safeParse(input);
    if (!parsed.success) throw new AiConnectionError("Thông tin kết nối chưa hợp lệ. Hãy tải lại danh sách.");
    const v = parsed.data;
    await db.$transaction(async tx => {
      await lock(tx, session);
      const row = (await selected(tx, session.companyId, v.id, v.version))!;
      const current = await tx.ket_noi_ai.findFirst({ where: { company_id: session.companyId, la_mac_dinh: true } });
      if (defaultConnectionStamp(current) !== v.expectedDefault) throw new AiConnectionError("Kết nối mặc định đã thay đổi. Hãy tải lại danh sách.");
      if (!row.dang_su_dung) throw new AiConnectionError("Bật kết nối trước khi đặt làm mặc định.");
      await readAiSecret(session.companyId, row.tham_chieu_bi_mat);
      if (current?.id === row.id) return;
      if (current) await tx.ket_noi_ai.update({ where: { id: current.id }, data: { la_mac_dinh: false, updated_at: nextVersion(current.updated_at) } });
      const after = await tx.ket_noi_ai.update({ where: { id: row.id }, data: { la_mac_dinh: true, updated_at: nextVersion(row.updated_at) } });
      await tx.nhat_ky_hoat_dong.create({ data: { ...audit(session, "AI_DEFAULT", "Đổi kết nối AI mặc định"), doi_tuong_id: `ket_noi_ai:${row.id}`,
        du_lieu_cu: metadata(current) ?? Prisma.DbNull, du_lieu_moi: metadata(after)! } });
    });
    refresh();
    return { success: true as const, ...await aiConnectionsView(session.companyId), message: "Đã đổi kết nối AI mặc định." };
  } catch (error) { return failure(error); }
}

export async function testAiKey(input: unknown) {
  try {
    const session = await actor(), parsed = TestAiKeySchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: "API key chưa hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors };
    const v = parsed.data, row = await selected(db, session.companyId, v.target, v.version);
    const apiKey = v.apiKey || (row ? await readAiSecret(session.companyId, row.tham_chieu_bi_mat) : v.target === "environment" ? (await readEnvironmentAiConnection(session.companyId))?.apiKey : undefined);
    if (!apiKey || !AiApiKeySchema.safeParse(apiKey).success) throw new AiConnectionError("Nhập API key trước khi kiểm tra.");
    await db.$transaction(async tx => {
      await lock(tx, session);
      await selected(tx, session.companyId, v.target, v.version);
      const count = await tx.nhat_ky_hoat_dong.count({ where: { company_id: session.companyId, account_id: session.userId,
        phan_he: "AI", hanh_dong: "AI_KEY_TEST", created_at: { gte: new Date(Date.now() - 300_000) } } });
      if (count >= 10) throw new AiConnectionError("Đã kiểm tra khóa nhiều lần. Hãy chờ vài phút rồi thử lại.");
      await tx.nhat_ky_hoat_dong.create({ data: { ...audit(session, "AI_KEY_TEST", "Kiểm tra quyền đọc danh sách model OpenAI"), doi_tuong_id: row ? `ket_noi_ai:${row.id}` : null } });
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
    await selected(db, session.companyId, v.target, v.version);
    return { success: true as const, models, message: "Đã đọc được danh sách model. Chọn model hỗ trợ hội thoại và gọi công cụ; thay đổi chỉ áp dụng sau khi lưu." };
  } catch (error) { return failure(error); }
}
