import { createHash } from "node:crypto";
import type { Prisma, ket_noi_ai } from "@prisma/client";
import { AiJobSchema, AiPricesSchema, type AiJob } from "@/lib/validations/ai-governance";
import { db } from "@/lib/db";
import { readAiSecret } from "@/lib/ai-secret-store";
import { AiConnectionError, emptyAiSettings, type AiSettingsView, type AiConnectionsView, type AiConnectionTarget } from "@/lib/validations/ai-settings";

// Server-only callers supply the company from their authenticated session.
export async function readEnvironmentAiConnection(companyId: number) {
  const id = Number(process.env.AI_PILOT_ACCOUNT_ID);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const owner = await db.tai_khoan.findUnique({ where: { id }, select: { company_id: true } });
  if (owner?.company_id !== companyId) return null;
  return { apiKey: process.env.OPENAI_API_KEY?.trim(), model: process.env.OPENAI_MODEL?.trim() };
}
export function connectionView(row: ket_noi_ai): AiSettingsView {
  return { target: row.id, name: row.ten_ket_noi, isDefault: row.la_mac_dinh, version: row.updated_at.toISOString(), model: row.model_mac_dinh,
    enabled: row.dang_su_dung, hasKey: true, maskedKey: `••••${row.hau_to_khoa}`, source: "managed" };
}
export function defaultConnectionStamp(row: ket_noi_ai | undefined | null) {
  return row ? `${row.id}:${row.updated_at.toISOString()}` : "none";
}
export async function aiConnectionsView(companyId: number): Promise<AiConnectionsView> {
  const rows = await db.ket_noi_ai.findMany({ where: { company_id: companyId }, orderBy: [{ la_mac_dinh: "desc" }, { id: "asc" }] });
  if (rows.length) return { connections: rows.map(connectionView), defaultStamp: defaultConnectionStamp(rows.find(row => row.la_mac_dinh)) };
  const environment = await readEnvironmentAiConnection(companyId), key = environment?.apiKey;
  return { connections: key ? [{ ...emptyAiSettings, target: "environment", name: "OpenAI từ máy chủ", isDefault: true,
    model: environment?.model ?? "", hasKey: true, maskedKey: `••••${key.slice(-4)}`, source: "environment" }] : [], defaultStamp: "none" };
}
export async function aiConnectionView(companyId: number, target?: AiConnectionTarget): Promise<AiSettingsView> {
  if (target === "new") return { ...emptyAiSettings };
  const list = await aiConnectionsView(companyId);
  const found = target === undefined ? list.connections.find(row => row.isDefault) : list.connections.find(row => row.target === target);
  if (!found && target !== undefined) throw new AiConnectionError("Kết nối không còn khả dụng. Hãy tải lại danh sách.");
  return found ?? { ...emptyAiSettings };
}
export async function readAiConnection(companyId: number, job: AiJob = "GENERAL", client: Prisma.TransactionClient = db) {
  AiJobSchema.parse(job);
  const routing = await client.cau_hinh_tac_vu_ai.findUnique({ where: { company_id_ma_tac_vu: { company_id: companyId, ma_tac_vu: job } } });
  // A managed company never falls back to environment, including a paused or absent default.
  const rows = await client.ket_noi_ai.findMany({ where: { company_id: companyId }, orderBy: { id: "asc" } });
  const row = routing?.ket_noi_ai_id ? rows.find(connection => connection.id === routing.ket_noi_ai_id) : rows.find(connection => connection.la_mac_dinh);
  if (routing?.ket_noi_ai_id && !row) throw new AiConnectionError("Kết nối của tác vụ không còn khả dụng.");
  if (row) {
    if (!row.dang_su_dung) throw new AiConnectionError("Kết nối AI đang tạm dừng. Người quản trị có thể bật lại tại Cài đặt chung → Quản trị AI.");
    const model = routing?.model ?? row.model_mac_dinh;
    const price = AiPricesSchema.safeParse(routing?.model ? routing.cau_hinh_gia : row.cau_hinh_gia);
    // A price or display-name edit does not change the credentials or model used by this turn.
    return { apiKey: await readAiSecret(companyId, row.tham_chieu_bi_mat), model,
      stamp: `db:${row.id}:${row.phien_ban_khoa}:${model}`, source: "managed", connectionId: row.id, keyVersion: row.phien_ban_khoa,
      limit: row.han_muc_chi_phi_thang, prices: price.success && price.data.model === model ? price.data : null };
  }
  if (rows.length) throw new AiConnectionError("Chưa chọn kết nối AI mặc định. Hãy chọn tại Cài đặt chung → Quản trị AI.");
  const environment = await readEnvironmentAiConnection(companyId), apiKey = environment?.apiKey, model = environment?.model;
  if (!apiKey || !model) throw new AiConnectionError("Chưa cấu hình kết nối AI. Người quản trị có thể thiết lập tại Cài đặt chung → Quản trị AI.");
  return { apiKey, model, stamp: createHash("sha256").update(`${apiKey}\0${model}`).digest("hex"), source: "environment", connectionId: null, keyVersion: null, limit: null, prices: null };
}
