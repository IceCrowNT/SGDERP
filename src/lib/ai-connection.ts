import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { readAiSecret } from "@/lib/ai-secret-store";
import { AiConnectionError, type AiSettingsView } from "@/lib/validations/ai-settings";

// Server-only callers supply the company from their authenticated session.
export async function aiConnectionView(companyId: number): Promise<AiSettingsView> {
  const row = await db.ket_noi_ai.findUnique({ where: { company_id: companyId } });
  if (row) return { version: row.updated_at.toISOString(), model: row.model_mac_dinh, enabled: row.dang_su_dung,
    hasKey: true, maskedKey: `••••${row.hau_to_khoa}`, source: "managed" };
  const key = process.env.OPENAI_API_KEY?.trim();
  return { version: null, model: process.env.OPENAI_MODEL?.trim() ?? "", enabled: true,
    hasKey: Boolean(key), maskedKey: key ? `••••${key.slice(-4)}` : null, source: key ? "environment" : "none" };
}

export async function readAiConnection(companyId: number) {
  const row = await db.ket_noi_ai.findUnique({ where: { company_id: companyId } });
  if (row) {
    if (!row.dang_su_dung) throw new AiConnectionError("Kết nối AI đang tạm dừng. Mở Cài đặt AI để bật lại.");
    return { apiKey: await readAiSecret(companyId, row.tham_chieu_bi_mat), model: row.model_mac_dinh,
      stamp: `db:${row.id}:${row.updated_at.toISOString()}`, source: "managed", connectionId: row.id, keyVersion: row.phien_ban_khoa };
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim(), model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !model) throw new AiConnectionError("Chưa cấu hình kết nối AI. Mở Cài đặt AI để nhập khóa và chọn model.");
  return { apiKey, model, stamp: createHash("sha256").update(`${apiKey}\0${model}`).digest("hex"), source: "environment", connectionId: null, keyVersion: null };
}
